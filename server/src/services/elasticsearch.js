import { ELASTICSEARCH_NODE } from "../config/env.js";

const INDEX = "tiles";

/**
 * Elasticsearch service with a MongoDB fallback.
 *
 * When `ELASTICSEARCH_NODE` is configured the tiles catalog is indexed in
 * Elasticsearch and searches are routed through it (zone-aware: filter by
 * `compatibleZones`, `category`, and text query `q`). Otherwise every function
 * reports "not configured" and callers fall back to the MongoDB `$text` path,
 * so dev environments run smoothly without an ES cluster.
 */
export const esService = {
  isConfigured() {
    return Boolean(ELASTICSEARCH_NODE);
  },

  /** Lazily load the client (dynamic import keeps the dep optional when unconfigured). */
  async client() {
    if (!ELASTICSEARCH_NODE) return null;
    const { Client } = await import("@elastic/elasticsearch");
    return new Client({ node: ELASTICSEARCH_NODE });
  },

  async createIndexIfMissing() {
    const client = await this.client();
    if (!client) return false;
    const exists = await client.indices.exists({ index: INDEX });
    if (!exists) {
      await client.indices.create({
        index: INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: "keyword" },
              title: { type: "text" },
              category: { type: "keyword" },
              categoryName: { type: "text" },
              material: { type: "text" },
              finish: { type: "text" },
              size: { type: "keyword" },
              sku: { type: "keyword" },
              colorTag: { type: "text" },
              compatibleZones: { type: "keyword" },
              price: { type: "double" },
              tileImage: { type: "keyword", index: false },
              thumbnailUrl: { type: "keyword", index: false },
            },
          },
        },
      });
    }
    return true;
  },

  async indexTile(tile) {
    const client = await this.client();
    if (!client) return false;
    const doc = {
      id: tile._id?.toString?.() || tile.id,
      title: tile.title,
      category: tile.category?.toString?.(),
      categoryName: tile.categoryName,
      material: tile.material,
      finish: tile.finish,
      size: tile.size,
      sku: tile.sku,
      colorTag: tile.colorTag,
      compatibleZones: tile.compatibleZones || [],
      price: tile.price,
      tileImage: tile.tileImage,
      thumbnailUrl: tile.thumbnailUrl,
    };
    await client.index({ index: INDEX, id: doc.id, document: doc });
    return true;
  },

  async removeTile(id) {
    const client = await this.client();
    if (!client) return false;
    await client.delete({ index: INDEX, id: String(id) }).catch(() => {});
    return true;
  },

  /**
   * Search tiles. Text query is OR'd across title/material/finish/colorTag and
   * can be combined with category and zone-compatibility filters.
   *
   * @param {{ q?: string, category?: string, compatibleZones?: string[], from?: number, size?: number }} params
   */
  async searchTiles({ q = "", category, compatibleZones = [], from = 0, size = 20 }) {
    const client = await this.client();
    if (!client) return null;

    await this.createIndexIfMissing().catch(() => {});

    const must = [];
    if (q.trim()) {
      must.push({
        multi_match: {
          query: q,
          fields: ["title^3", "material^2", "finish^2", "colorTag", "sku"],
          fuzziness: "AUTO",
        },
      });
    }
    const filter = [];
    if (category) filter.push({ term: { category } });
    if (compatibleZones.length) {
      filter.push({ terms: { compatibleZones } });
    }

    const body = await client.search({
      index: INDEX,
      from,
      size,
      query: {
        bool: {
          must: must.length ? must : [{ match_all: {} }],
          filter,
        },
      },
    });

    return {
      tiles: body.hits.hits.map((h) => h._source),
      totalItems: typeof body.hits.total === "number" ? body.hits.total : body.hits.total?.value ?? 0,
    };
  },
};
