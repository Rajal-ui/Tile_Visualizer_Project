const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Admin = require('../models/Admin.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const cache = require('../services/cache.service');
const logger = require('../utils/logger');
const { jwt: jwtConfig, isProd } = require('../config/env');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'strict' : 'lax',
};

const refreshTtlSeconds = () => {
  // crude parse of "7d" / "15m" style expiry strings into seconds
  const match = /^(\d+)([smhd])$/.exec(jwtConfig.refreshExpiry);
  if (!match) return 7 * 24 * 60 * 60;
  const value = parseInt(match[1], 10);
  const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
  return value * unit;
};

/**
 * POST /auth/login
 * Single-admin login. Applies account lockout after repeated failures.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
  if (!admin) throw ApiError.unauthorized('Invalid email or password');

  if (admin.isLocked()) {
    const minsLeft = Math.ceil((admin.lockUntil - Date.now()) / 60000);
    throw ApiError.forbidden(`Account locked due to failed attempts. Try again in ${minsLeft} minute(s).`);
  }

  if (!admin.isActive) {
    throw ApiError.forbidden('This account has been deactivated');
  }

  const validPassword = await admin.comparePassword(password);
  if (!validPassword) {
    admin.failedLoginAttempts += 1;
    if (admin.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      admin.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      admin.failedLoginAttempts = 0;
      logger.warn(`Admin account locked: ${admin.email}`);
    }
    await admin.save();
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Successful login - reset lockout counters
  admin.failedLoginAttempts = 0;
  admin.lockUntil = null;
  admin.lastLoginAt = new Date();
  admin.lastLoginIp = req.ip;
  await admin.save();

  const accessToken = admin.generateAccessToken();
  const tokenId = uuidv4();
  const refreshToken = jwt.sign(
    { sub: admin._id.toString(), type: 'refresh', jti: tokenId },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiry }
  );

  await cache.storeRefreshToken(admin._id.toString(), tokenId, refreshTtlSeconds());
  await cache.del(`admin:profile:${admin._id}`); // bust stale cache

  res
    .cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 })
    .cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: refreshTtlSeconds() * 1000 })
    .status(200)
    .json(
      new ApiResponse(
        200,
        { admin: admin.toSafeJSON(), accessToken, refreshToken },
        'Login successful'
      )
    );
});

/**
 * POST /auth/refresh-token
 * Rotates refresh tokens (old one is revoked, new one issued).
 */
const refreshToken = asyncHandler(async (req, res) => {
  const incoming = req.body.refreshToken || req.cookies?.refreshToken;
  if (!incoming) throw ApiError.unauthorized('Refresh token missing');

  let decoded;
  try {
    decoded = jwt.verify(incoming, jwtConfig.refreshSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  if (decoded.type !== 'refresh') throw ApiError.unauthorized('Invalid token type');

  const isValid = await cache.isRefreshTokenValid(decoded.sub, decoded.jti);
  if (!isValid) throw ApiError.unauthorized('Refresh token has been revoked. Please log in again.');

  const admin = await Admin.findById(decoded.sub);
  if (!admin || !admin.isActive) throw ApiError.unauthorized('Account not found or deactivated');

  // Rotate: revoke old, issue new
  await cache.revokeRefreshToken(decoded.sub, decoded.jti);
  const newTokenId = uuidv4();
  const newRefreshToken = jwt.sign(
    { sub: admin._id.toString(), type: 'refresh', jti: newTokenId },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiry }
  );
  await cache.storeRefreshToken(admin._id.toString(), newTokenId, refreshTtlSeconds());

  const accessToken = admin.generateAccessToken();

  res
    .cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 })
    .cookie('refreshToken', newRefreshToken, { ...cookieOptions, maxAge: refreshTtlSeconds() * 1000 })
    .status(200)
    .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, 'Token refreshed'));
});

/**
 * POST /auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const incoming = req.body.refreshToken || req.cookies?.refreshToken;
  if (incoming) {
    try {
      const decoded = jwt.verify(incoming, jwtConfig.refreshSecret);
      await cache.revokeRefreshToken(decoded.sub, decoded.jti);
    } catch {
      // token already invalid/expired - nothing to revoke
    }
  }

  res
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .status(200)
    .json(new ApiResponse(200, null, 'Logged out successfully'));
});

/**
 * POST /auth/logout-all — revoke every active session for this admin
 */
const logoutAll = asyncHandler(async (req, res) => {
  await cache.revokeAllRefreshTokens(req.admin.id);
  await cache.del(`admin:profile:${req.admin.id}`);
  res
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .status(200)
    .json(new ApiResponse(200, null, 'Logged out from all devices'));
});

/** GET /auth/me */
const me = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { admin: req.admin }, 'Current admin fetched'));
});

/** PUT /auth/change-password */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = await Admin.findById(req.admin.id).select('+password');

  const valid = await admin.comparePassword(currentPassword);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');

  admin.password = newPassword;
  await admin.save();

  await cache.revokeAllRefreshTokens(admin._id.toString());
  await cache.del(`admin:profile:${admin._id}`);

  res.status(200).json(new ApiResponse(200, null, 'Password changed. Please log in again.'));
});

module.exports = { login, refreshToken, logout, logoutAll, me, changePassword };
