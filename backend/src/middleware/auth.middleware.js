const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const Admin = require('../models/Admin.model');
const cache = require('../services/cache.service');

/**
 * Requires a valid access token in `Authorization: Bearer <token>` header
 * (or `accessToken` cookie as fallback). Attaches `req.admin`.
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw ApiError.unauthorized('Access token missing. Please log in.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, jwtConfig.accessSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token expired');
    }
    throw ApiError.unauthorized('Invalid access token');
  }

  if (decoded.type !== 'access') {
    throw ApiError.unauthorized('Invalid token type');
  }

  // Use cached admin profile when possible to avoid a DB hit on every request
  const cacheKey = `admin:profile:${decoded.sub}`;
  const cached = await cache.get(cacheKey);

  let admin;
  if (cached) {
    admin = cached;
  } else {
    const found = await Admin.findById(decoded.sub);
    if (!found || !found.isActive) {
      throw ApiError.unauthorized('Account not found or deactivated');
    }
    admin = found.toSafeJSON();
    await cache.set(cacheKey, admin, 300);
  }

  req.admin = admin;
  req.tokenPayload = decoded;
  next();
});

/**
 * Restricts access to specific roles. Usage: requireRole('super_admin')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.admin) throw ApiError.unauthorized('Authentication required');
  if (!roles.includes(req.admin.role)) {
    throw ApiError.forbidden('You do not have permission to perform this action');
  }
  next();
};

module.exports = { requireAuth, requireRole };
