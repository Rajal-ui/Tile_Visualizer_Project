import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { connectDb, disconnectDb } from "../config/db.js";
import { Tile } from "../models/index.js";
import { cloudinaryService } from "../services/cloudinary.js";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from "../config/env.js";

async function run() {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error("❌ Cloudinary is not fully configured. Cannot run migration.");
    process.exit(1);
  }

  const connection = await connectDb();
  if (!connection) {
    console.error("❌ Database connection failed.");
    process.exit(1);
  }

  console.log("Starting Cloudinary migration for tile textures...");

  // 1. Get all tiles from DB
  const tiles = await Tile.find({});
  console.log(`Found ${tiles.length} tiles in the database.`);

  let migratedCount = 0;
  const projectRoot = path.resolve(process.cwd(), "../client/public");

  for (const tile of tiles) {
    if (tile.texture && tile.texture.src && !tile.texture.src.startsWith("http")) {
      console.log(`\nMigrating: ${tile.title}`);
      
      const normalizedSrc = path.normalize(tile.texture.src.replace(/^\/+/, ""));
      const filePath = path.join(projectRoot, normalizedSrc);
      const relative = path.relative(projectRoot, filePath);
      if (path.isAbsolute(relative) || relative.startsWith("..")) {
        console.error(`  ❌ Failed to process ${tile.texture.src}: Invalid texture path traversal`);
        continue;
      }
      try {
        const buffer = await fs.readFile(filePath);
        const filename = path.basename(filePath);
        
        console.log(`  Uploading ${filename}...`);
        const { url, thumbnailUrl } = await cloudinaryService.uploadTileImage(buffer, filename);
        
        tile.texture.src = url;
        tile.tileImage = url; // Also update the old tileImage field just in case
        tile.thumbnailUrl = thumbnailUrl;
        
        await tile.save();
        console.log(`  ✅ Success: ${url}`);
        migratedCount++;
      } catch (err) {
        console.error(`  ❌ Failed to process ${tile.texture.src}:`, err.message);
      }
    } else {
      console.log(`\nSkipping: ${tile.title} (already uses CDN or has no local texture)`);
    }
  }

  console.log(`\n🎉 Migration complete. Migrated ${migratedCount} tiles to Cloudinary.`);
  await disconnectDb();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
