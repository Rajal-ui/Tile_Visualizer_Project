const redisClient = require('../config/redis');
const logger = require('../utils/logger');
const { redis: redisConfig } = require('../config/env');

/**
 * Thin caching wrapper around ioredis. All failures are swallowed and logged
 * so that Redis being unavailable never takes down the API - it just falls
 * back to hitting MongoDB / Elasticsearch directly (graceful degradation).
 */
class CacheService {
  async get(key) {
    try {
      const raw = await redisClient.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      logger.warn(`Cache GET failed for key=${key}: ${err.message}`);
      return null;
    }
  }

  async set(key, value, ttlSeconds = redisConfig.ttlMedium) {
    try {
      await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return true;
    } catch (err) {
      logger.warn(`Cache SET failed for key=${key}: ${err.message}`);
      return false;
    }
  }

  async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (err) {
      logger.warn(`Cache DEL failed for key=${key}: ${err.message}`);
      return false;
    }
  }

  /**
   * Deletes all keys matching a pattern, e.g. "tiles:list:*".
   * Uses SCAN instead of KEYS to avoid blocking Redis on large datasets.
   */
  async delByPattern(pattern) {
    try {
      const stream = redisClient.scanStream({ match: pattern, count: 100 });
      const pipeline = redisClient.pipeline();
      let found = 0;

      await new Promise((resolve, reject) => {
        stream.on('data', (keys) => {
          if (keys.length) {
            found += keys.length;
            keys.forEach((key) => pipeline.del(key));
          }
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      if (found > 0) await pipeline.exec();
      return found;
    } catch (err) {
      logger.warn(`Cache delByPattern failed for pattern=${pattern}: ${err.message}`);
      return 0;
    }
  }

  async remember(key, ttlSeconds, producerFn) {
    const cached = await this.get(key);
    if (cached !== null) return { data: cached, fromCache: true };

    const fresh = await producerFn();
    await this.set(key, fresh, ttlSeconds);
    return { data: fresh, fromCache: false };
  }

  // ---- Refresh-token allow-list (used for logout / token rotation) ----
  async storeRefreshToken(adminId, tokenId, ttlSeconds) {
    return this.set(`refresh:${adminId}:${tokenId}`, true, ttlSeconds);
  }

  async isRefreshTokenValid(adminId, tokenId) {
    const val = await this.get(`refresh:${adminId}:${tokenId}`);
    return val === true;
  }

  async revokeRefreshToken(adminId, tokenId) {
    return this.del(`refresh:${adminId}:${tokenId}`);
  }

  async revokeAllRefreshTokens(adminId) {
    return this.delByPattern(`refresh:${adminId}:*`);
  }
}

module.exports = new CacheService();
