const Tile = require('../models/Tile.model');
const Visualization = require('../models/Visualization.model');
const { cloudinary } = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const cache = require('../services/cache.service');
const esService = require('../services/elasticsearch.service');
const { generateCataloguePdf } = require('../services/pdf.service');
const logger = require('../utils/logger');

const normalizeApplication = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : String(value).split(',').map((v) => v.trim());
};

/**
 * GET /tiles/search - primary browse/search/filter endpoint, backed by
 * Elasticsearch for speed, with Redis caching per unique query signature.
 */
const searchTiles = asyncHandler(async (req, res) => {
  const {
    q = '',
    material,
    finish,
    category,
    application,
    color,
    minPrice,
    maxPrice,
    isFeatured,
    page = 1,
    limit = 20,
    sort = 'relevance',
  } = req.query;

  const filters = { material, finish, category, application, color, minPrice, maxPrice };
  if (isFeatured !== undefined) filters.isFeatured = isFeatured === 'true';

  const cacheKey = `tiles:search:${JSON.stringify({ q, filters, page, limit, sort })}`;

  const { data, fromCache } = await cache.remember(cacheKey, 120, async () => {
    try {
      return await esService.searchTiles({
        query: q,
        filters,
        page: Number(page),
        limit: Number(limit),
        sort,
      });
    } catch (err) {
      logger.error(`Elasticsearch search failed, falling back to MongoDB: ${err.message}`);
      return fallbackMongoSearch({ q, filters, page: Number(page), limit: Number(limit) });
    }
  });

  res.status(200).json(new ApiResponse(200, data, 'Tiles fetched', { cache: fromCache }));
});

/** Fallback text search directly against MongoDB if Elasticsearch is down */
async function fallbackMongoSearch({ q, filters, page, limit }) {
  const mongoFilter = { isActive: true };
  if (q) mongoFilter.$text = { $search: q };
  if (filters.material) mongoFilter.material = filters.material;
  if (filters.finish) mongoFilter.finish = filters.finish;
  if (filters.category) mongoFilter.category = filters.category;
  if (filters.application) mongoFilter.application = { $in: normalizeApplication(filters.application) };

  const skip = (page - 1) * limit;
  const [results, total] = await Promise.all([
    Tile.find(mongoFilter).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Tile.countDocuments(mongoFilter),
  ]);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    results,
    facets: null,
    degraded: true,
  };
}

/** GET /tiles/autocomplete?q= */
const autocomplete = asyncHandler(async (req, res) => {
  const { q = '' } = req.query;
  if (!q.trim()) return res.status(200).json(new ApiResponse(200, { suggestions: [] }));

  const cacheKey = `tiles:autocomplete:${q.toLowerCase()}`;
  const { data } = await cache.remember(cacheKey, 300, () => esService.autocompleteTiles(q));

  res.status(200).json(new ApiResponse(200, { suggestions: data }));
});

/** GET /tiles/:id */
const getTile = asyncHandler(async (req, res) => {
  const cacheKey = `tiles:detail:${req.params.id}`;
  const { data: tile, fromCache } = await cache.remember(cacheKey, 1800, async () => {
    const found = await Tile.findById(req.params.id);
    if (!found) throw ApiError.notFound('Tile not found');
    return found;
  });

  res.status(200).json(new ApiResponse(200, { tile, cache: fromCache }, 'Tile fetched'));
});

/** POST /tiles (admin) - multipart fields: image, textureImage (optional) */
const createTile = asyncHandler(async (req, res) => {
  const body = req.body;
  const imageFile = req.files?.image?.[0];
  const textureFile = req.files?.textureImage?.[0];

  if (!imageFile) throw ApiError.badRequest('Tile image is required');

  const tile = await Tile.create({
    title: body.title,
    sku: body.sku,
    category: body.category,
    application: normalizeApplication(body.application),
    material: body.material,
    finish: body.finish,
    size: {
      length: body.length ?? body.size?.length,
      width: body.width ?? body.size?.width,
      unit: body.unit || 'mm',
    },
    thickness: body.thickness,
    color: body.color,
    tilesInBox: body.tilesInBox,
    coverageAreaPerBox: body.coverageAreaPerBox,
    longevity: body.longevity,
    price: { value: body.price, unit: body.priceUnit || 'per sq.ft' },
    description: body.description,
    isFeatured: body.isFeatured === 'true' || body.isFeatured === true,
    image: { url: imageFile.path, publicId: imageFile.filename },
    textureImage: textureFile ? { url: textureFile.path, publicId: textureFile.filename } : undefined,
    createdBy: req.admin.id,
  });

  await esService.indexTile(tile.toSearchDocument());
  await cache.delByPattern('tiles:search:*');
  await cache.delByPattern('tiles:autocomplete:*');

  res.status(201).json(new ApiResponse(201, { tile }, 'Tile created'));
});

/** PUT /tiles/:id (admin) */
const updateTile = asyncHandler(async (req, res) => {
  const tile = await Tile.findById(req.params.id);
  if (!tile) throw ApiError.notFound('Tile not found');

  const body = req.body;
  const editableFields = [
    'title', 'sku', 'category', 'material', 'finish', 'thickness', 'color',
    'tilesInBox', 'coverageAreaPerBox', 'longevity', 'description',
  ];
  editableFields.forEach((f) => {
    if (body[f] !== undefined) tile[f] = body[f];
  });

  if (body.application !== undefined) tile.application = normalizeApplication(body.application);
  if (body.length !== undefined) tile.size.length = body.length;
  if (body.width !== undefined) tile.size.width = body.width;
  if (body.price !== undefined) tile.price.value = body.price;
  if (body.isFeatured !== undefined) tile.isFeatured = body.isFeatured === 'true' || body.isFeatured === true;
  if (body.isActive !== undefined) tile.isActive = body.isActive === 'true' || body.isActive === true;

  const imageFile = req.files?.image?.[0];
  const textureFile = req.files?.textureImage?.[0];

  if (imageFile) {
    if (tile.image?.publicId) await cloudinary.uploader.destroy(tile.image.publicId).catch(() => {});
    tile.image = { url: imageFile.path, publicId: imageFile.filename };
  }
  if (textureFile) {
    if (tile.textureImage?.publicId) await cloudinary.uploader.destroy(tile.textureImage.publicId).catch(() => {});
    tile.textureImage = { url: textureFile.path, publicId: textureFile.filename };
  }

  await tile.save();

  await esService.updateTile(tile._id.toString(), tile.toSearchDocument());
  await cache.del(`tiles:detail:${tile._id}`);
  await cache.delByPattern('tiles:search:*');
  await cache.delByPattern('tiles:autocomplete:*');

  res.status(200).json(new ApiResponse(200, { tile }, 'Tile updated'));
});

/** DELETE /tiles/:id (admin) */
const deleteTile = asyncHandler(async (req, res) => {
  const tile = await Tile.findById(req.params.id);
  if (!tile) throw ApiError.notFound('Tile not found');

  const usageCount = await Visualization.countDocuments({
    $or: [
      { 'appliedTiles.floor': tile._id },
      { 'appliedTiles.wall': tile._id },
      { 'appliedTiles.ceiling': tile._id },
    ],
  });
  if (usageCount > 0) {
    throw ApiError.conflict(
      `Cannot delete tile used in ${usageCount} saved visualization(s). Deactivate it instead.`
    );
  }

  const publicIds = [tile.image?.publicId, tile.textureImage?.publicId].filter(Boolean);
  await Promise.all(publicIds.map((id) => cloudinary.uploader.destroy(id).catch(() => {})));

  await tile.deleteOne();
  await esService.deleteTile(tile._id.toString());

  await cache.del(`tiles:detail:${tile._id}`);
  await cache.delByPattern('tiles:search:*');
  await cache.delByPattern('tiles:autocomplete:*');

  res.status(200).json(new ApiResponse(200, null, 'Tile deleted'));
});

/** GET /tiles/catalogue/pdf - downloadable PDF catalogue (streamed) */
const downloadCataloguePdf = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.material) filter.material = req.query.material;

  const tiles = await Tile.find(filter).sort({ category: 1, title: 1 }).limit(500);
  if (!tiles.length) throw ApiError.notFound('No tiles found for the given filters');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="tile-catalogue.pdf"');

  await generateCataloguePdf(tiles, res);
});

module.exports = {
  searchTiles,
  autocomplete,
  getTile,
  createTile,
  updateTile,
  deleteTile,
  downloadCataloguePdf,
};
