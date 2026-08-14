import { Router } from "express";
import mongoose from "mongoose";
import { Tile, CategoryTemplate } from "../models/index.js";
import { TileSchema, validate } from "@tile-visualizer/shared/schemas/index.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { esService } from "../services/elasticsearch.js";

const router = Router();

/** Write endpoints are reserved for authenticated admins. */
const adminOnly = [requireAuth, requireRole("admin")];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Coerce a query value to a positive integer, falling back when invalid. */
function parsePositiveInt(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function parsePagination(query) {
  return {
    page: parsePositiveInt(query.page, DEFAULT_PAGE),
    limit: Math.min(parsePositiveInt(query.limit, DEFAULT_LIMIT), MAX_LIMIT),
  };
}

/** Build a Mongoose filter from the supported list query params. */
function buildListFilter(query) {
  const filter = {};
  const { category, room, size, material, finish } = query;

  if (category !== undefined) {
    if (!mongoose.isValidObjectId(category)) {
      const error = new Error(
        "Invalid 'category' filter — must be a valid 24-character MongoDB ObjectId"
      );
      error.status = 400;
      throw error;
    }
    filter.category = category;
  }
  if (room) filter.rooms = room;
  if (size) filter.size = size;
  if (material) filter.material = material;
  if (finish) filter.finish = finish;
  return filter;
}

/** Standard list/search response envelope. */
function sendList(res, tiles, totalItems, page, limit) {
  res.json({
    data: tiles,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit) || 0,
      totalItems,
    },
  });
}

/**
 * GET /api/v1/tiles — public list with filters + pagination.
 * Filters: category, room, size, material, finish. page defaults to 1, limit to 20.
 */
router.get("/", async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const filter = buildListFilter(req.query);
    const skip = (page - 1) * limit;

    const [tiles, totalItems] = await Promise.all([
      Tile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("category", "name").lean(),
      Tile.countDocuments(filter),
    ]);

    sendList(res, tiles, totalItems, page, limit);
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error("list tiles error:", err.message);
    res.status(500).json({ error: "Failed to list tiles" });
  }
});

/**
 * GET /api/v1/tiles/search — full-text search across title, material, finish
 * and size. Routes through Elasticsearch when `ELASTICSEARCH_NODE` is set
 * (zone-aware via `compatibleZones`), otherwise falls back to the Mongo `$text`
 * index.
 */
router.get("/search", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q) {
      return res.status(400).json({ error: "Missing required query parameter 'q'" });
    }

    const { page, limit } = parsePagination(req.query);
    const skip = (page - 1) * limit;
    const { category, compatibleZone } = req.query;

    // Elasticsearch path (zone-aware).
    if (esService.isConfigured()) {
      const result = await esService.searchTiles({
        q,
        category: typeof category === "string" ? category : undefined,
        compatibleZones: typeof compatibleZone === "string" ? [compatibleZone] : undefined,
        from: skip,
        size: limit,
      });
      if (result) {
        return sendList(res, result.tiles, result.totalItems, page, limit);
      }
    }

    // MongoDB $text fallback.
    const filter = { $text: { $search: q } };
    if (category) filter.category = category;
    if (compatibleZone) filter.compatibleZones = compatibleZone;

    const [tiles, totalItems] = await Promise.all([
      Tile.find(filter)
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(limit)
        .populate("category", "name")
        .lean(),
      Tile.countDocuments(filter),
    ]);

    sendList(res, tiles, totalItems, page, limit);
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error("search tiles error:", err.message);
    res.status(500).json({ error: "Failed to search tiles" });
  }
});

/** GET /api/v1/tiles/:id — public tile detail. */
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Tile not found" });
    }
    const tile = await Tile.findById(req.params.id).populate("category", "name").lean();
    if (!tile) {
      return res.status(404).json({ error: "Tile not found" });
    }
    res.json({ data: tile });
  } catch (err) {
    console.error("get tile error:", err.message);
    res.status(500).json({ error: "Failed to fetch tile" });
  }
});

/** Verify the referenced category exists (both create and update paths). */
async function assertCategoryExists(res, categoryId) {
  const category = await CategoryTemplate.findById(categoryId).lean();
  if (!category) {
    res.status(400).json({ error: "Category does not exist" });
    return false;
  }
  return true;
}

/** POST /api/v1/tiles — create tile (admin only). */
router.post("/", adminOnly, async (req, res) => {
  const check = validate(TileSchema, req.body);
  if (!check.ok) {
    return res.status(400).json({ error: check.errors.join("; ") });
  }

  try {
    if (!(await assertCategoryExists(res, check.data.category))) return;
    const tile = await Tile.create(check.data);
    indexTileBestEffort(tile);
    res.status(201).json({ data: tile });
  } catch (err) {
    console.error("create tile error:", err.message);
    res.status(500).json({ error: "Failed to create tile" });
  }
});

/** PATCH /api/v1/tiles/:id — partial update (admin only). */
router.patch("/:id", adminOnly, async (req, res) => {
  const check = validate(TileSchema.partial(), req.body);
  if (!check.ok) {
    return res.status(400).json({ error: check.errors.join("; ") });
  }

  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Tile not found" });
    }
    if (check.data.category) {
      if (!(await assertCategoryExists(res, check.data.category))) return;
    }

    const tile = await Tile.findByIdAndUpdate(req.params.id, check.data, { new: true }).lean();
    if (!tile) {
      return res.status(404).json({ error: "Tile not found" });
    }
    indexTileBestEffort(tile);
    res.json({ data: tile });
  } catch (err) {
    console.error("update tile error:", err.message);
    res.status(500).json({ error: "Failed to update tile" });
  }
});

/** DELETE /api/v1/tiles/:id — remove tile (admin only). */
router.delete("/:id", adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Tile not found" });
    }
    const tile = await Tile.findByIdAndDelete(req.params.id);
    if (!tile) {
      return res.status(404).json({ error: "Tile not found" });
    }
    esService.removeTile(tile._id).catch(() => {});
    res.status(204).end();
  } catch (err) {
    console.error("delete tile error:", err.message);
    res.status(500).json({ error: "Failed to delete tile" });
  }
});

/** Best-effort ES indexing hook (no-op / silent when ES is unconfigured). */
async function indexTileBestEffort(tile) {
  if (!esService.isConfigured()) return;
  try {
    const doc = tile?.toObject?.() ?? tile;
    const cat = doc.category ? await CategoryTemplate.findById(doc.category).lean() : null;
    await esService.indexTile({ ...doc, categoryName: cat?.name });
  } catch (e) {
    console.error("ES index error:", e.message);
  }
}

export default router;
