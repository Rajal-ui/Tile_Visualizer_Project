import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import sharp from "sharp";
import { layoutStorage } from "../services/layout-storage.js";
import { sanitizeRoomId } from "../services/layout-storage.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.get("/", async (_req, res) => {
  try {
    res.json(await layoutStorage.listLayouts());
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

export default router;
