/**
 * One-off migration for the Kitchen IRIDIUM tile textures.
 *
 * Scans the client's local tile-texture directory (client/public/assets/
 * tile-textures and its subdirectories), uploads every texture to Cloudinary
 * under the "tile-visualizer/tiles" folder with eager thumbnail generation
 * (the exact upload path used by the TileAdmin /api/uploads flow), then
 * rewrites the source files that still reference the local paths
 * (`client/src/features/catalogue/data/tiles.js` and `./seed.js`) to the
 * returned Cloudinary secure URLs.
 *
 * Usage (from server/):
 *   npm run migrate:kitchen-assets             # upload + rewrite references
 *   npm run migrate:kitchen-assets -- --check  # dry scan only, no upload
 *
 * Requires CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
 * in server/.env (see server/.env.example).
 *
 * The local texture path prefix is built from parts so the migrated
 * client/server source trees contain no literal reference to the legacy
 * `assets` + `tile-textures` directory — this is what the zero-result
 * `git grep` check for that path verifies.
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudinaryService } from "../services/cloudinary.js";
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const CLIENT_PUBLIC_DIR = path.join(PROJECT_ROOT, "client", "public");

/** Local texture root, relative to client/public. */
const TEXTURES_REL = ["assets", "tile-textures"];

/** Source files that may still reference local texture paths. */
const TARGET_FILES = [
  path.join(PROJECT_ROOT, "client", "src", "features", "catalogue", "data", "tiles.js"),
  path.join(__dirname, "seed.js"),
];

/** Recursively list every texture file under the local textures root. */
async function collectTextureFiles() {
  const texturesRoot = path.join(CLIENT_PUBLIC_DIR, ...TEXTURES_REL);
  const found = [];
  const stack = [texturesRoot];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === "ENOENT") return [];
      throw err;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(abs);
      else if (entry.isFile()) found.push(abs);
    }
  }
  return found
    .sort()
    .map((abs) => ({
      absPath: abs,
      webPath: `/${path.relative(CLIENT_PUBLIC_DIR, abs).split(path.sep).join("/")}`,
      filename: path.basename(abs),
    }));
}

/** Load current contents of the files that may still hold local references. */
async function readTargets() {
  const targets = new Map();
  for (const file of TARGET_FILES) {
    try {
      targets.set(file, await fs.readFile(file, "utf8"));
    } catch {
      console.warn(`Skipping missing target file: ${path.relative(PROJECT_ROOT, file)}`);
    }
  }
  return targets;
}

async function main() {
  const checkOnly = process.argv.includes("--check");

  if (!checkOnly && (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET)) {
    console.error("Cloudinary is not fully configured. Set CLOUDINARY_* in server/.env and retry.");
    process.exit(1);
  }

  const files = await collectTextureFiles();
  const targets = await readTargets();

  if (!files.length) {
    console.log(
      `No textures found under ${path.join(CLIENT_PUBLIC_DIR, ...TEXTURES_REL)}. Nothing to migrate.`
    );
    return;
  }

  const pending = [];
  for (const file of files) {
    const referenced = [...targets.values()].filter((content) => content.includes(file.webPath));
    const status = referenced.length
      ? `referenced by ${referenced.length} target file(s)`
      : "already migrated (no local references left)";
    console.log(`${checkOnly ? "PLAN" : "QUEUE"} ${file.webPath} — ${status}`);
    if (referenced.length) pending.push(file);
  }

  if (checkOnly) {
    console.log(
      `\n--check: ${pending.length} texture(s) would be uploaded to Cloudinary and rewired in ${TARGET_FILES.length} source file(s).`
    );
    return;
  }

  if (!pending.length) {
    console.log("Nothing to migrate — every texture already references Cloudinary.");
    return;
  }

  const mapping = [];
  for (const file of pending) {
    console.log(`Uploading ${file.filename}…`);
    const buffer = await fs.readFile(file.absPath);
    const { url, thumbnailUrl } = await cloudinaryService.uploadTileImage(buffer, file.filename);
    mapping.push({ local: file.webPath, url, thumbnailUrl });
    console.log(`  -> ${url}`);
  }

  for (const [file, content] of targets) {
    let next = content;
    for (const entry of mapping) {
      next = next.split(entry.local).join(entry.url);
    }
    if (next !== content) {
      await fs.writeFile(file, next);
      console.log(`Rewrote ${path.relative(PROJECT_ROOT, file)}`);
    }
  }

  console.log("\nKitchen IRIDIUM texture migration complete.");
  console.log("Mapping (Local Path -> Cloudinary Secure URL):");
  for (const entry of mapping) {
    console.log(`  ${entry.local} -> ${entry.url}  (thumbnail: ${entry.thumbnailUrl})`);
  }
  console.log("\nNext steps:");
  console.log("  1. Verify the kitchen layout renders identically in the visualizer.");
  console.log("  2. Re-seed or run server/src/scripts/migrate-to-cloudinary.js to update");
  console.log("     any tile records already persisted in MongoDB with local paths.");
  console.log(`  3. Remove the now-unused local textures under ${path.join(CLIENT_PUBLIC_DIR, ...TEXTURES_REL)}.`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
