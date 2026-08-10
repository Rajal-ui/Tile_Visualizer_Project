const Redis = require('ioredis');
const { redis: redisConfig } = require('./env');
const logger = require('../utils/logger');

// Two clients: one for general commands, one dedicated to pub/sub if ever needed.
const redisClient = new Redis(redisConfig.url, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
  lazyConnect: false,
});

redisClient.on('connect', () => logger.info('Redis connected'));
redisClient.on('error', (err) => logger.error(`Redis error: ${err.message}`));
redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));

module.exports = redisClient;
