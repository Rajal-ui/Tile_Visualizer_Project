/**
 * Rebuilds the Elasticsearch tiles index from the MongoDB source of truth.
 * Useful after schema changes, data migrations, or if the ES index was lost.
 * Run: `npm run reindex`.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { mongoUri } = require('../src/config/env');
const Tile = require('../src/models/Tile.model');
const { esClient } = require('../src/config/elasticsearch');
const { TILES_INDEX, ensureTilesIndex, bulkIndexTiles } = require('../src/services/elasticsearch.service');

async function run() {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const exists = await esClient.indices.exists({ index: TILES_INDEX });
  if (exists) {
    await esClient.indices.delete({ index: TILES_INDEX });
    console.log(`Deleted existing index "${TILES_INDEX}"`);
  }
  await ensureTilesIndex();

  const tiles = await Tile.find({});
  console.log(`Found ${tiles.length} tiles in MongoDB`);

  const docs = tiles.map((t) => t.toSearchDocument());
  const BATCH_SIZE = 500;
  let totalIndexed = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    // eslint-disable-next-line no-await-in-loop
    const result = await bulkIndexTiles(batch);
    totalIndexed += result.indexed;
    console.log(`Indexed batch ${i / BATCH_SIZE + 1}: ${result.indexed}/${batch.length}`);
  }

  console.log(`✅ Reindexing complete. ${totalIndexed}/${docs.length} tiles indexed.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Reindexing failed:', err);
  process.exit(1);
});
