import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import sharp from "sharp";
import { validateLayout } from "@tile-visualizer/shared/schemas/layout.js";
import { Layout } from "../models/layout.js";
import mongoose from "mongoose";

const ROOM_ID_RE = /^[a-z0-9][a-z0-9-_]*$/i;
const FILENAME_RE = /^[a-z0-9._-]+\.(png|jpg|jpeg|webp)$/i;

function sanitizeRoomId(roomId) {
  if (typeof roomId !== "string" || !ROOM_ID_RE.test(roomId)) {
    throw new Error(`Invalid room id: ${roomId}`);
  }
  return roomId;
}

function sanitizeFilename(name) {
  if (typeof name !== "string" || !FILENAME_RE.test(path.basename(name))) {
    throw new Error(`Invalid filename: ${name}`);
  }
  return path.basename(name);
}

export class LayoutStorage {
  constructor(root) {
    this.root = path.resolve(root);
  }

  roomDir(roomId) {
    return path.join(this.root, sanitizeRoomId(roomId));
  }

  assetsDir(roomId) {
    return path.join(this.roomDir(roomId), "assets");
  }

  masksDir(roomId) {
    return path.join(this.assetsDir(roomId), "masks");
  }

  configPath(roomId) {
    return path.join(this.roomDir(roomId), "config.json");
  }

  /**
   * Resolve a (possibly nested) asset path like "background.png" or
   * "masks/floor.png" to an absolute file path, rejecting traversal.
   */
  resolveAssetPath(roomId, assetPath) {
    sanitizeRoomId(roomId);
    if (typeof assetPath !== "string") throw new Error("Invalid asset path");
    const rel = path.normalize(assetPath).replace(/\\/g, "/");
    if (rel.startsWith("/") || rel.includes("..")) {
      throw new Error("Invalid asset path");
    }
    const segments = rel.split("/").filter(Boolean);
    if (segments.length > 2 || segments.length === 0) {
      throw new Error("Unsupported asset path");
    }
    const dirRe = /^[a-z0-9][a-z0-9-_]*$/i;
    for (let i = 0; i < segments.length; i++) {
      const isLast = i === segments.length - 1;
      const seg = segments[i];
      if (isLast) {
        if (!FILENAME_RE.test(seg)) throw new Error(`Invalid filename: ${seg}`);
      } else if (!dirRe.test(seg)) {
        throw new Error(`Invalid directory segment: ${seg}`);
      }
    }
    return path.join(this.assetsDir(roomId), ...segments);
  }

  assetUrl(roomId, assetPath) {
    return `/api/layouts/${sanitizeRoomId(roomId)}/assets/${assetPath.replace(/\\/g, "/").replace(/^\/+/, "")}`;
  }

  async getAssetStream(roomId, assetPath) {
    const filePath = this.resolveAssetPath(roomId, assetPath);
    return createReadStream(filePath);
  }

  async readAssetBuffer(roomId, assetPath) {
    const filePath = this.resolveAssetPath(roomId, assetPath);
    return fs.readFile(filePath);
  }

  async ensureLayout(roomId, meta = null) {
    const dir = this.roomDir(roomId);
    await fs.mkdir(this.assetsDir(roomId), { recursive: true });
    await fs.mkdir(this.masksDir(roomId), { recursive: true });
    
    let config = await Layout.findOne({ id: roomId });
    if (!config && meta) {
      const seed = {
        id: roomId,
        name: meta.name || roomId,
        type: meta.type || "photo",
        background: null,
        foreground: null,
        zones: [],
        status: "draft",
      };
      await this.saveConfig(roomId, seed);
    }
  }

  /**
   * Reads a layout configuration by its room ID.
   * Runs the legacy filesystem migration before retrieving from the database.
   * @param {string} roomId - The unique identifier of the room layout.
   * @returns {Promise<Object>} The layout configuration object.
   * @throws {Error} If the layout is not found.
   */
  async readConfig(roomId) {
    await this._migrateLegacyLayouts();
    const config = await Layout.findOne({ id: roomId });
    if (!config) throw new Error(`Layout not found: ${roomId}`);
    return config.toJSON();
  }

  /**
   * Saves or updates a layout configuration in the database.
   * Validates the configuration before saving and ensures necessary asset directories exist.
   * @param {string} roomId - The unique identifier of the room layout.
   * @param {Object} config - The layout configuration to save.
   * @returns {Promise<Object>} The updated layout configuration object.
   * @throws {Error} If the layout configuration is invalid.
   */
  async saveConfig(roomId, config) {
    sanitizeRoomId(roomId);
    const { ok, errors } = validateLayout(config);
    if (!ok) {
      errors.unshift(`Layout config for "${roomId}" invalid`);
      throw new Error(errors.join("; "));
    }
    
    await fs.mkdir(this.assetsDir(roomId), { recursive: true });
    await fs.mkdir(this.masksDir(roomId), { recursive: true });

    const updated = await Layout.findOneAndUpdate(
      { id: roomId },
      { $set: config },
      { new: true, upsert: true }
    );
    return updated.toJSON();
  }

  /**
   * Migrates legacy layout configurations from the local filesystem to the MongoDB database.
   * This is an idempotent operation that skips if already migrated or if the database is disconnected.
   * @returns {Promise<void>}
   * @private
   */
  async _migrateLegacyLayouts() {
    if (this._migrated || mongoose.connection.readyState === 0) return;
    this._migrated = true;
    try {
      const dirs = await fs.readdir(this.root, { withFileTypes: true });
      for (const d of dirs) {
        if (!d.isDirectory()) continue;
        const confPath = path.join(this.root, d.name, "config.json");
        try {
          const exists = await Layout.findOne({ id: d.name });
          if (exists) continue;
          
          const raw = await fs.readFile(confPath, "utf-8");
          const config = JSON.parse(raw);
          await Layout.create(config);
        } catch (e) {
          // ignore missing or malformed legacy files
        }
      }
    } catch (e) {
      // ignore root directory missing
    }
  }

  /**
   * Lists all available layout configurations from the database.
   * Runs the legacy filesystem migration before retrieving.
   * @returns {Promise<Array<Object>>} An array of summary layout objects.
   */
  async listLayouts() {
    await this._migrateLegacyLayouts();
    const layouts = await Layout.find({}).lean();
    return layouts.map(cfg => ({
      id: cfg.id,
      name: cfg.name,
      type: cfg.type,
      status: cfg.status,
      hasBackground: !!cfg.background,
      hasForeground: !!cfg.foreground,
      zoneCount: cfg.zones?.length || 0,
    }));
  }

  async writeAssetBuffer(roomId, kind, buffer, filename) {
    sanitizeRoomId(roomId);
    sanitizeFilename(filename);
    if (kind === "background" || kind === "foreground") {
      const outDir = this.assetsDir(roomId);
      const ext = path.extname(filename).toLowerCase();
      const target = path.join(outDir, `${kind}${ext === ".jpg" || ext === ".jpeg" ? ".jpg" : ".png"}`);
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(target, buffer);
      return this.assetUrl(roomId, path.basename(target));
    }
    throw new Error(`Unknown asset kind: ${kind}`);
  }

  async writeMaskBuffer(roomId, zoneId, buffer) {
    sanitizeRoomId(roomId);
    if (typeof zoneId !== "string" || !ROOM_ID_RE.test(zoneId)) {
      throw new Error(`Invalid zone id: ${zoneId}`);
    }
    const dir = this.masksDir(roomId);
    await fs.mkdir(dir, { recursive: true });
    const target = path.join(dir, `${zoneId}.png`);
    await fs.writeFile(target, buffer);
    return `/api/layouts/${roomId}/assets/masks/${zoneId}.png`;
  }

  /**
   * Rasterize a zone's polygon (and its plane corners, if a quad) into an
   * antialiased white-on-transparent mask PNG stored under assets/masks/<zoneId>.png.
   * Used as a fallback when no mask PNG is uploaded with a JSON save.
   */
  async rasterizeMask(roomId, zoneId, { polygon, corners, width, height }) {
    sanitizeRoomId(roomId);
    const pts = polygon || corners;
    const points = (pts || []).map(([x, y]) => `${x},${y + 0}`).join(" ");
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
        `<polygon points="${points}" fill="white" fill-rule="evenodd"/>` +
        `</svg>`
    );
    const png = await sharp(svg).png().toBuffer();
    return this.writeMaskBuffer(roomId, zoneId, png);
  }
}

export const layoutStorage = new LayoutStorage(process.env.STORAGE_ROOT || "storage");
export { sanitizeRoomId, sanitizeFilename };
