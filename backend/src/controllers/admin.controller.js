const Admin = require('../models/Admin.model');
const Room = require('../models/Room.model');
const Layout = require('../models/Layout.model');
const Tile = require('../models/Tile.model');
const Visualization = require('../models/Visualization.model');
const { cloudinary } = require('../config/cloudinary');
const redisClient = require('../config/redis');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const cache = require('../services/cache.service');

/** GET /admin/dashboard - aggregate stats for the admin home screen */
const dashboard = asyncHandler(async (req, res) => {
  const cacheKey = 'admin:dashboard:stats';
  const { data, fromCache } = await cache.remember(cacheKey, 120, async () => {
    const [rooms, layouts, tiles, activeTiles, visualizations, tilesByMaterial] = await Promise.all([
      Room.countDocuments(),
      Layout.countDocuments(),
      Tile.countDocuments(),
      Tile.countDocuments({ isActive: true }),
      Visualization.countDocuments(),
      Tile.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$material', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      totals: { rooms, layouts, tiles, activeTiles, visualizations },
      tilesByMaterial,
    };
  });

  res.status(200).json(new ApiResponse(200, { ...data, cache: fromCache }));
});

/** GET /admin/system-health - quick check of Mongo/Redis/Elasticsearch */
const systemHealth = asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  const { checkElasticConnection } = require('../config/elasticsearch');

  const [redisOk, elasticOk] = await Promise.all([
    redisClient.ping().then(() => true).catch(() => false),
    checkElasticConnection(),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      mongo: mongoose.connection.readyState === 1,
      redis: redisOk,
      elasticsearch: elasticOk,
    })
  );
});

/** PUT /admin/profile */
const updateProfile = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin.id);
  if (!admin) throw ApiError.notFound('Admin not found');

  const { name } = req.body;
  if (name !== undefined) admin.name = name;

  if (req.file) {
    if (admin.avatar?.publicId) {
      await cloudinary.uploader.destroy(admin.avatar.publicId).catch(() => {});
    }
    admin.avatar = { url: req.file.path, publicId: req.file.filename };
  }

  await admin.save();
  await cache.del(`admin:profile:${admin._id}`);

  res.status(200).json(new ApiResponse(200, { admin: admin.toSafeJSON() }, 'Profile updated'));
});

module.exports = { dashboard, systemHealth, updateProfile };
