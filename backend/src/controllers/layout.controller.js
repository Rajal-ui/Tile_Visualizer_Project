const Layout = require('../models/Layout.model');
const Room = require('../models/Room.model');
const Visualization = require('../models/Visualization.model');
const { cloudinary } = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const cache = require('../services/cache.service');

const parseZones = (zones) => (typeof zones === 'string' ? JSON.parse(zones) : zones);

/** GET /layouts?room=:roomId - public, cached per room */
const listLayouts = asyncHandler(async (req, res) => {
  const { room } = req.query;
  const cacheKey = `layouts:list:${room || 'all'}`;

  const { data, fromCache } = await cache.remember(cacheKey, 1800, async () => {
    const filter = { isActive: true };
    if (room) filter.room = room;
    return Layout.find(filter).populate('room', 'name slug').sort({ displayOrder: 1, createdAt: 1 });
  });

  res.status(200).json(new ApiResponse(200, { layouts: data, cache: fromCache }, 'Layouts fetched'));
});

/** GET /layouts/:id */
const getLayout = asyncHandler(async (req, res) => {
  const cacheKey = `layouts:detail:${req.params.id}`;
  const { data: layout, fromCache } = await cache.remember(cacheKey, 1800, async () => {
    const found = await Layout.findById(req.params.id).populate('room', 'name slug');
    if (!found) throw ApiError.notFound('Layout not found');
    return found;
  });

  res.status(200).json(new ApiResponse(200, { layout, cache: fromCache }, 'Layout fetched'));
});

/** POST /layouts (admin) - expects multipart fields: previewImage, baseImage */
const createLayout = asyncHandler(async (req, res) => {
  const { name, room, tags, displayOrder } = req.body;
  const zones = parseZones(req.body.zones);

  const roomDoc = await Room.findById(room);
  if (!roomDoc) throw ApiError.badRequest('Invalid room id');

  const previewFile = req.files?.previewImage?.[0];
  const baseFile = req.files?.baseImage?.[0];
  if (!previewFile || !baseFile) {
    throw ApiError.badRequest('Both previewImage and baseImage files are required');
  }

  const layout = await Layout.create({
    name,
    room,
    zones,
    tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim())) : [],
    displayOrder,
    previewImage: { url: previewFile.path, publicId: previewFile.filename },
    baseImage: { url: baseFile.path, publicId: baseFile.filename },
  });

  await cache.delByPattern('layouts:*');
  res.status(201).json(new ApiResponse(201, { layout }, 'Layout created'));
});

/** PUT /layouts/:id (admin) */
const updateLayout = asyncHandler(async (req, res) => {
  const layout = await Layout.findById(req.params.id);
  if (!layout) throw ApiError.notFound('Layout not found');

  const { name, tags, displayOrder, isActive } = req.body;
  if (name !== undefined) layout.name = name;
  if (displayOrder !== undefined) layout.displayOrder = displayOrder;
  if (isActive !== undefined) layout.isActive = isActive;
  if (tags !== undefined) {
    layout.tags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
  }
  if (req.body.zones !== undefined) {
    layout.zones = parseZones(req.body.zones);
  }

  const previewFile = req.files?.previewImage?.[0];
  const baseFile = req.files?.baseImage?.[0];

  if (previewFile) {
    if (layout.previewImage?.publicId) {
      await cloudinary.uploader.destroy(layout.previewImage.publicId).catch(() => {});
    }
    layout.previewImage = { url: previewFile.path, publicId: previewFile.filename };
  }

  if (baseFile) {
    if (layout.baseImage?.publicId) {
      await cloudinary.uploader.destroy(layout.baseImage.publicId).catch(() => {});
    }
    layout.baseImage = { url: baseFile.path, publicId: baseFile.filename };
  }

  await layout.save();
  await cache.delByPattern('layouts:*');

  res.status(200).json(new ApiResponse(200, { layout }, 'Layout updated'));
});

/** DELETE /layouts/:id (admin) */
const deleteLayout = asyncHandler(async (req, res) => {
  const layout = await Layout.findById(req.params.id);
  if (!layout) throw ApiError.notFound('Layout not found');

  const usageCount = await Visualization.countDocuments({ layout: layout._id });
  if (usageCount > 0) {
    throw ApiError.conflict(
      `Cannot delete layout used in ${usageCount} saved visualization(s). Deactivate it instead.`
    );
  }

  const publicIds = [layout.previewImage?.publicId, layout.baseImage?.publicId].filter(Boolean);
  await Promise.all(publicIds.map((id) => cloudinary.uploader.destroy(id).catch(() => {})));

  await layout.deleteOne();
  await cache.delByPattern('layouts:*');

  res.status(200).json(new ApiResponse(200, null, 'Layout deleted'));
});

module.exports = { listLayouts, getLayout, createLayout, updateLayout, deleteLayout };
