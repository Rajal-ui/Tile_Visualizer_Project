const Room = require('../models/Room.model');
const Layout = require('../models/Layout.model');
const { cloudinary } = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const cache = require('../services/cache.service');

const ROOMS_LIST_CACHE_KEY = 'rooms:list:all';

/** GET /rooms - public list, cached */
const listRooms = asyncHandler(async (req, res) => {
  const { data, fromCache } = await cache.remember(ROOMS_LIST_CACHE_KEY, 1800, async () => {
    const rooms = await Room.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    return rooms;
  });

  res
    .status(200)
    .json(new ApiResponse(200, { rooms: data, cache: fromCache }, 'Rooms fetched'));
});

/** GET /rooms/:id */
const getRoom = asyncHandler(async (req, res) => {
  const cacheKey = `rooms:detail:${req.params.id}`;
  const { data: room, fromCache } = await cache.remember(cacheKey, 1800, async () => {
    const found = await Room.findById(req.params.id);
    if (!found) throw ApiError.notFound('Room not found');
    return found;
  });

  res.status(200).json(new ApiResponse(200, { room, cache: fromCache }, 'Room fetched'));
});

/** POST /rooms (admin) */
const createRoom = asyncHandler(async (req, res) => {
  const { name, description, displayOrder } = req.body;

  const existing = await Room.findOne({ name });
  if (existing) throw ApiError.conflict(`Room "${name}" already exists`);

  const room = await Room.create({
    name,
    description,
    displayOrder,
    coverImage: req.file
      ? { url: req.file.path, publicId: req.file.filename }
      : undefined,
  });

  await cache.delByPattern('rooms:*');
  res.status(201).json(new ApiResponse(201, { room }, 'Room created'));
});

/** PUT /rooms/:id (admin) */
const updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw ApiError.notFound('Room not found');

  const { description, displayOrder, isActive } = req.body;
  if (description !== undefined) room.description = description;
  if (displayOrder !== undefined) room.displayOrder = displayOrder;
  if (isActive !== undefined) room.isActive = isActive;

  if (req.file) {
    if (room.coverImage?.publicId) {
      await cloudinary.uploader.destroy(room.coverImage.publicId).catch(() => {});
    }
    room.coverImage = { url: req.file.path, publicId: req.file.filename };
  }

  await room.save();
  await cache.delByPattern('rooms:*');

  res.status(200).json(new ApiResponse(200, { room }, 'Room updated'));
});

/** DELETE /rooms/:id (admin) */
const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw ApiError.notFound('Room not found');

  const layoutCount = await Layout.countDocuments({ room: room._id });
  if (layoutCount > 0) {
    throw ApiError.conflict(
      `Cannot delete room with ${layoutCount} existing layout(s). Deactivate it instead, or remove its layouts first.`
    );
  }

  if (room.coverImage?.publicId) {
    await cloudinary.uploader.destroy(room.coverImage.publicId).catch(() => {});
  }

  await room.deleteOne();
  await cache.delByPattern('rooms:*');

  res.status(200).json(new ApiResponse(200, null, 'Room deleted'));
});

module.exports = { listRooms, getRoom, createRoom, updateRoom, deleteRoom };
