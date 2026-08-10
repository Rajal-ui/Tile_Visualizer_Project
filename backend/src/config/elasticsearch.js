const { Client } = require('@elastic/elasticsearch');
const { elastic } = require('./env');
const logger = require('../utils/logger');

const esClient = new Client({
  node: elastic.node,
  auth:
    elastic.username && elastic.password
      ? { username: elastic.username, password: elastic.password }
      : undefined,
  maxRetries: 3,
  requestTimeout: 10000,
});

async function checkElasticConnection() {
  try {
    const health = await esClient.cluster.health();
    logger.info(`Elasticsearch cluster status: ${health.status}`);
    return true;
  } catch (err) {
    logger.error(`Elasticsearch connection failed: ${err.message}`);
    return false;
  }
}

module.exports = { esClient, checkElasticConnection };
