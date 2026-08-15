import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import sharp from "sharp";
import { layoutStorage } from "../services/layout-storage.js";
import { sanitizeRoomId } from "../services/layout-storage.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import {
  LAYOUT_STATUSES,
  STATUS_PUBLISHED,
  validateLayout,
} from "@tile-visualizer/shared/schemas/layout.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.get("/", async (req, res) => {
  try {
    const { roomId, status } = req.query;
    res.json(await layoutStorage.listLayouts({ roomId, status }));
  } catch (e) {
    res.status(500).json({ error: "Failed to list layouts", details: e.message });
  }
});

router.get("/:roomId", async (req, res) => {
  try {
    res.json(await layoutStorage.readConfig(req.params.roomId));
  } catch {
    res.status(404).json({ error: `Layout not found: ${req.params.roomId}` });
  }
});

router.get("/:roomId/assets/*", async (req, res) => {
  try {
    const assetPath = req.params[0];
    const filePath = layoutStorage.resolveAssetPath(req.params.roomId, assetPath);
    const stat = await fs.promises.stat(filePath);
    res.type(path.extname(assetPath) || "png");
    // Assets are replaceable in place (re-upload keeps the same URL), so always
    // revalidate and send Last-Modified to allow conditional 304 responses.
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Last-Modified", stat.mtime.toUTCString());
    if (req.headers["if-modified-since"]) {
      const ifModified = new Date(req.headers["if-modified-since"]);
      if (ifModified >= stat.mtime) return res.status(304).end();
    }
    const stream = await layoutStorage.getAssetStream(req.params.roomId, assetPath);
    stream.on("error", () => res.status(404).json({ error: "Asset not found" }));
    stream.pipe(res);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

router.post("/:roomId", requireAuth, requireRole("admin"), upload.any(), async (req, res) => {
  try {
    const { roomId } = req.params;
    sanitizeRoomId(roomId);

    const multipart = req.is("multipart/form-data");
    const config = multipart ? (req.body.config ? JSON.parse(req.body.config) : {}) : req.body;
    config.id = roomId;
    config.assets = config.assets || {};
    config.assets.masks = config.assets.masks || {};

    const files = req.files || [];
    const bgFile = files.find((f) => f.fieldname === "background");
    const fgFile = files.find((f) => f.fieldname === "foreground");

    // Persist background/foreground if re-uploaded.
    let width = null;
    let height = null;
    if (bgFile) {
      config.background = await layoutStorage.writeAssetBuffer(roomId, "background", bgFile.buffer, bgFile.originalname);
      const meta = await sharp(bgFile.buffer).metadata();
      width = meta.width;
      height = meta.height;
    } else if (fgFile) {
      const meta = await sharp(fgFile.buffer).metadata();
      width = meta.width;
      height = meta.height;
    } else if (config.background) {
      try {
        const base = path.basename(new URL(config.background, "http://x").pathname);
        const meta = await sharp(await layoutStorage.readAssetBuffer(roomId, base)).metadata();
        width = meta.width;
        height = meta.height;
      } catch {
        // background unreadable for now; dims unknown -> skip mask rasterize
      }
    }

    if (fgFile) {
      config.foreground = await layoutStorage.writeAssetBuffer(roomId, "foreground", fgFile.buffer, fgFile.originalname);
    }

    for (const zone of config.zones || []) {
      const uploaded = files.find((f) => f.fieldname === zone.id);
      if (uploaded) {
        config.assets.masks[zone.id] = await layoutStorage.writeMaskBuffer(roomId, zone.id, uploaded.buffer);
        continue;
      }
      const plane = (zone.planes || []).find((p) => p.polygon && p.polygon.length >= 3);
      if (plane && width && height) {
        config.assets.masks[zone.id] = await layoutStorage.rasterizeMask(roomId, zone.id, {
          polygon: plane.polygon,
          corners: plane.corners,
          width,
          height,
        });
      }
    }

    await layoutStorage.saveConfig(roomId, config);
    res.json({ ok: true, layout: config });
  } catch (e) {
    console.error("save layout error:", e);
    res.status(400).json({ error: e.message });
  }
});

/**
 * PATCH /api/layouts/:roomId — update a layout's status (admin only).
 *
 * The wizard's final step calls this with { status: "published" } to take a
 * draft live. Publishing requires the layout to validate and to have at least
 * one completed plane (polygon with 3+ points), mirroring the editor's guard.
 */
router.patch("/:roomId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { roomId } = req.params;
    sanitizeRoomId(roomId);

    const { status } = req.body || {};
    if (!LAYOUT_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${LAYOUT_STATUSES.join(", ")}` });
    }

    const config = await layoutStorage.readConfig(roomId);
    const next = { ...config, status };

    if (status === STATUS_PUBLISHED) {
      const hasRenderablePlane = (next.zones || []).some((zone) =>
        (zone.planes || []).some((plane) => (plane.polygon || []).length >= 3)
      );
      if (!hasRenderablePlane) {
        return res.status(400).json({
          error: "Publishing requires at least one completed plane (polygon with 3+ points).",
        });
      }
      const { ok, errors } = validateLayout(next);
      if (!ok) {
        return res.status(400).json({ error: errors.join("; ") });
      }
    }

    const updated = await layoutStorage.saveConfig(roomId, next);
    res.json({ data: updated });
  } catch (e) {
    if (e.message?.startsWith("Layout not found")) {
      return res.status(404).json({ error: e.message });
    }
    console.error("update layout status error:", e.message);
    res.status(400).json({ error: e.message });
  }
});

/**
 * DELETE /api/layouts/:roomId — permanently remove a layout (admin only).
 *
 * Deletes the database record and any stored asset files on disk. There is no
 * undo, so the admin UI confirms before calling this.
 */
router.delete("/:roomId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { roomId } = req.params;
    sanitizeRoomId(roomId);
    await layoutStorage.deleteLayout(roomId);
    res.json({ ok: true, deleted: roomId });
  } catch (e) {
    if (e.message?.startsWith("Layout not found")) {
      return res.status(404).json({ error: e.message });
    }
    console.error("delete layout error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;
