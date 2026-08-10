const { esClient } = require('../config/elasticsearch');
const { elastic } = require('../config/env');
const logger = require('../utils/logger');

const TILES_INDEX = elastic.tilesIndex;

const TILES_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 1,
    analysis: {
      analyzer: {
        tile_autocomplete: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding'],
        },
      },
    },
  },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      title: {
        type: 'text',
        analyzer: 'tile_autocomplete',
        fields: { keyword: { type: 'keyword' } },
      },
      sku: { type: 'keyword' },
      imageUrl: { type: 'keyword', index: false },
      category: { type: 'keyword' },
      application: { type: 'keyword' },
      material: { type: 'keyword' },
      finish: { type: 'keyword' },
      size: { type: 'keyword' },
      length: { type: 'float' },
      width: { type: 'float' },
      thickness: { type: 'float' },
      color: { type: 'keyword' },
      longevity: { type: 'keyword' },
      price: { type: 'float' },
      description: { type: 'text' },
      isActive: { type: 'boolean' },
      isFeatured: { type: 'boolean' },
      createdAt: { type: 'date' },
    },
  },
};

async function ensureTilesIndex() {
  const exists = await esClient.indices.exists({ index: TILES_INDEX });
  if (!exists) {
    await esClient.indices.create({ index: TILES_INDEX, ...TILES_MAPPING });
    logger.info(`Elasticsearch index "${TILES_INDEX}" created`);
  }
}

async function indexTile(doc) {
  await esClient.index({
    index: TILES_INDEX,
    id: doc.id,
    document: doc,
    refresh: 'wait_for',
  });
}

async function updateTile(id, partialDoc) {
  await esClient.update({
    index: TILES_INDEX,
    id,
    doc: partialDoc,
    doc_as_upsert: true,
    refresh: 'wait_for',
  });
}

async function deleteTile(id) {
  try {
    await esClient.delete({ index: TILES_INDEX, id, refresh: 'wait_for' });
  } catch (err) {
    if (err.meta?.statusCode !== 404) throw err;
  }
}

async function bulkIndexTiles(docs) {
  if (!docs.length) return { indexed: 0 };
  const operations = docs.flatMap((doc) => [
    { index: { _index: TILES_INDEX, _id: doc.id } },
    doc,
  ]);
  const result = await esClient.bulk({ refresh: true, operations });
  if (result.errors) {
    const failed = result.items.filter((i) => i.index?.error);
    logger.error(`Bulk index had ${failed.length} failures`, { failed: failed.slice(0, 5) });
  }
  return { indexed: docs.length - (result.errors ? result.items.filter((i) => i.index?.error).length : 0) };
}

/**
 * Fast, filterable, paginated tile search.
 * filters: { material, finish, category, application, color, minPrice, maxPrice,
 *            minSize, maxSize, isFeatured }
 */
async function searchTiles({ query = '', filters = {}, page = 1, limit = 20, sort = 'relevance' }) {
  const must = [];
  const filter = [{ term: { isActive: true } }];

  if (query && query.trim()) {
    must.push({
      multi_match: {
        query,
        fields: ['title^3', 'material^2', 'finish^2', 'color', 'description'],
        fuzziness: 'AUTO',
      },
    });
  } else {
    must.push({ match_all: {} });
  }

  const termFilters = ['material', 'finish', 'category', 'color'];
  termFilters.forEach((f) => {
    if (filters[f]) {
      const values = Array.isArray(filters[f]) ? filters[f] : [filters[f]];
      filter.push({ terms: { [f]: values } });
    }
  });

  if (filters.application) {
    const values = Array.isArray(filters.application) ? filters.application : [filters.application];
    filter.push({ terms: { application: values } });
  }

  if (filters.minPrice || filters.maxPrice) {
    filter.push({
      range: {
        price: {
          ...(filters.minPrice ? { gte: Number(filters.minPrice) } : {}),
          ...(filters.maxPrice ? { lte: Number(filters.maxPrice) } : {}),
        },
      },
    });
  }

  if (filters.isFeatured !== undefined) {
    filter.push({ term: { isFeatured: !!filters.isFeatured } });
  }

  const sortMap = {
    relevance: undefined,
    newest: [{ createdAt: 'desc' }],
    price_asc: [{ price: 'asc' }],
    price_desc: [{ price: 'desc' }],
    title_asc: [{ 'title.keyword': 'asc' }],
  };

  const from = (Math.max(page, 1) - 1) * limit;

  const body = {
    index: TILES_INDEX,
    from,
    size: limit,
    query: { bool: { must, filter } },
    sort: sortMap[sort],
    aggs: {
      materials: { terms: { field: 'material', size: 20 } },
      finishes: { terms: { field: 'finish', size: 20 } },
      categories: { terms: { field: 'category', size: 20 } },
      applications: { terms: { field: 'application', size: 10 } },
      colors: { terms: { field: 'color', size: 30 } },
      priceRange: { stats: { field: 'price' } },
    },
  };

  const result = await esClient.search(body);

  return {
    total: result.hits.total.value,
    page,
    limit,
    totalPages: Math.ceil(result.hits.total.value / limit),
    results: result.hits.hits.map((h) => ({ ...h._source, _score: h._score })),
    facets: {
      materials: result.aggregations.materials.buckets,
      finishes: result.aggregations.finishes.buckets,
      categories: result.aggregations.categories.buckets,
      applications: result.aggregations.applications.buckets,
      colors: result.aggregations.colors.buckets,
      priceRange: result.aggregations.priceRange,
    },
  };
}

async function autocompleteTiles(prefix, size = 8) {
  const result = await esClient.search({
    index: TILES_INDEX,
    size,
    query: {
      bool: {
        must: [{ match: { title: { query: prefix, fuzziness: 'AUTO' } } }],
        filter: [{ term: { isActive: true } }],
      },
    },
    _source: ['id', 'title', 'imageUrl', 'category'],
  });
  return result.hits.hits.map((h) => h._source);
}

module.exports = {
  TILES_INDEX,
  ensureTilesIndex,
  indexTile,
  updateTile,
  deleteTile,
  bulkIndexTiles,
  searchTiles,
  autocompleteTiles,
};
