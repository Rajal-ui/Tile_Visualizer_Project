const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redisClient = require('../config/redis');
const { rateLimit: rlConfig } = require('../config/env');
const ApiError = require('../utils/ApiError');

const buildStore = (prefix) =>
  new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: `rl:${prefix}:`,
  });

const handler = (req, res, next) => {
  next(new ApiError(429, 'Too many requests. Please try again later.'));
};

// General API rate limiter - applied globally
const apiLimiter = rateLimit({
  windowMs: rlConfig.windowMs,
  max: rlConfig.max,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('api'),
  handler,
});

// Strict limiter for the login endpoint to slow down brute-force attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: rlConfig.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('login'),
  keyGenerator: (req) => `${req.ip}:${(req.body?.email || '').toLowerCase()}`,
  handler,
});

// Looser limiter for search-heavy endpoints (still protects Elasticsearch)
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('search'),
  handler,
});

module.exports = { apiLimiter, loginLimiter, searchLimiter };
