const Visualization = require('../models/Visualization.model');
const Layout = require('../models/Layout.model');
const Tile = require('../models/Tile.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const cache = require('../services/cache.service');

/**
 * POST /visualizations - persist which tiles were applied to which
 * surfaces (floor/wall/ceiling) of a layout, so it can be revisited,
 * shared via link, or exported to PDF later.
 */
const saveVisualization = asyncHandler(async (req, res) => {
  const { room, layout, appliedTiles = {}, title, notes } = req.body;

  const layoutDoc = await Layout.findById(layout);
  if (!layoutDoc) throw ApiError.badRequest('Invalid layout id');
  if (String(layoutDoc.room) !== String(room)) {
    throw ApiError.badRequest('Layout does not belong to the specified room');
  }

  const tileIds = Object.values(appliedTiles).filter(Boolean);
  if (tileIds.length) {
    const count = await Tile.countDocuments({ _id: { $in: tileIds } });
    if (count !== tileIds.length) throw ApiError.badRequest('One or more applied tile ids are invalid');
  }

  const visualization = await Visualization.create({
    admin: req.admin.id,
    room,
    layout,
    appliedTiles,
    title,
    notes,
  });

  res.status(201).json(new ApiResponse(201, { visualization }, 'Visualization saved'));
});

/** GET /visualizations (admin) - list own saved visualizations, paginated */
const listVisualizations = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = { admin: req.admin.id };
  if (req.query.room) filter.room = req.query.room;

  const [visualizations, total] = await Promise.all([
    Visualization.find(filter)
      .populate('room', 'name')
      .populate('layout', 'name previewImage')
      .populate('appliedTiles.floor appliedTiles.wall appliedTiles.ceiling', 'title image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Visualization.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      visualizations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  );
});

/** GET /visualizations/:id */
const getVisualization = asyncHandler(async (req, res) => {
  const visualization = await Visualization.findById(req.params.id)
    .populate('room', 'name')
    .populate('layout')
    .populate('appliedTiles.floor appliedTiles.wall appliedTiles.ceiling');

  if (!visualization) throw ApiError.notFound('Visualization not found');

  res.status(200).json(new ApiResponse(200, { visualization }));
});

/** GET /visualizations/share/:shareId - public, no auth (for sharing a design link) */
const getSharedVisualization = asyncHandler(async (req, res) => {
  const cacheKey = `viz:share:${req.params.shareId}`;
  const { data: visualization, fromCache } = await cache.remember(cacheKey, 600, async () => {
    const found = await Visualization.findOne({ shareId: req.params.shareId })
      .populate('room', 'name')
      .populate('layout')
      .populate('appliedTiles.floor appliedTiles.wall appliedTiles.ceiling');
    if (!found) throw ApiError.notFound('Shared visualization not found');
    return found;
  });

  res.status(200).json(new ApiResponse(200, { visualization, cache: fromCache }));
});

/** DELETE /visualizations/:id */
const deleteVisualization = asyncHandler(async (req, res) => {
  const visualization = await Visualization.findOne({ _id: req.params.id, admin: req.admin.id });
  if (!visualization) throw ApiError.notFound('Visualization not found');

  await visualization.deleteOne();
  await cache.del(`viz:share:${visualization.shareId}`);

  res.status(200).json(new ApiResponse(200, null, 'Visualization deleted'));
});

module.exports = {
  saveVisualization,
  listVisualizations,
  getVisualization,
  getSharedVisualization,
  deleteVisualization,
};
