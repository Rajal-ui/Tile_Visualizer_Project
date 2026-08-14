/**
 * Database seed script (Phase 1 / Issue 1).
 *
 * Wipes and re-seeds: one admin user, room category templates (room × type),
 * and the 6-tile IRIDIUM catalogue. Requires a reachable MongoDB:
 *
 *   MONGODB_URI=… node src/scripts/seed.js
 *
 * Idempotent: collections are cleared before insert, so re-running reseeds.
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDb, disconnectDb } from "../config/db.js";
import { Admin, CategoryTemplate, Tile, Project, Room } from "../models/index.js";
import {
  ROOM_IDS,
  TEMPLATE_TYPES,
  AdminSchema,
  CategoryTemplateSchema,
  TileSchema,
  RoomSchema,
  validate,
} from "@tile-visualizer/shared/schemas/index.js";

if (process.env.NODE_ENV === "production") {
  if (!process.env.ADMIN_SEED_USERNAME || !process.env.ADMIN_SEED_EMAIL || !process.env.ADMIN_SEED_PASSWORD) {
    console.error("❌ Missing explicit ADMIN_SEED_* environment variables in production.");
    process.exit(1);
  }
}

const ADMIN_USERNAME = process.env.ADMIN_SEED_USERNAME || "admin";
const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || "admin123";

/** Mirror of client/src/features/rooms/data/rooms.jsx (display info only). */
const ROOM_SEED = [
  { id: "living-room", name: "Living Room", description: "Relaxed & social spaces" },
  { id: "bedroom", name: "Bedroom", description: "Calm & restful retreats" },
  { id: "kitchen", name: "Kitchen", description: "Functional & fresh workspaces" },
  { id: "bathroom", name: "Bathroom", description: "Clean & spa-like details" },
  { id: "staircase", name: "Staircase", description: "Statements that ascend" },
  { id: "facade", name: "Exterior", description: "Facades & outdoor faces" },
];

/** Mirror of client/src/features/catalogue/data/tiles.js. */
const TILE_SEED = [
  {
    title: "Iridium Aruba Armani",
    tileImage: "/assets/tile-textures/IRIDIUM/Iridium Aruba Armani.png",
    size: "600x600mm",
    format: "600x600",
    material: "Porcelain",
    finish: "Matt",
    pattern: "grid",
    grout: "#c6cbd3",
    price: 1800,
    rooms: ["kitchen", "living-room", "bathroom"],
    colors: ["#b8c4c8", "#8fa4aa"],
    texture: { kind: "image", src: "/assets/tile-textures/IRIDIUM/Iridium Aruba Armani.png" },
    properties: { thickness: "10mm", tilesInBox: 4, longevity: "15+ years", application: "Floor" },
  },
  {
    title: "Iridium Belgium Rossata",
    tileImage: "/assets/tile-textures/IRIDIUM/Iridium Belgium rossata.png",
    size: "600x600mm",
    format: "600x600",
    material: "Porcelain",
    finish: "Matt",
    pattern: "grid",
    grout: "#b0a89e",
    price: 1900,
    rooms: ["kitchen", "living-room"],
    colors: ["#c4b8a8", "#a89888"],
    texture: { kind: "image", src: "/assets/tile-textures/IRIDIUM/Iridium Belgium rossata.png" },
    properties: { thickness: "10mm", tilesInBox: 4, longevity: "15+ years", application: "Floor" },
  },
  {
    title: "Iridium Dubbo Beige",
    tileImage: "/assets/tile-textures/IRIDIUM/Iridium Dubbo beige.png",
    size: "600x600mm",
    format: "600x600",
    material: "Porcelain",
    finish: "Matt",
    pattern: "grid",
    grout: "#c9bfb0",
    price: 1750,
    rooms: ["kitchen", "living-room", "bedroom"],
    colors: ["#d4c8b4", "#b8a890"],
    texture: { kind: "image", src: "/assets/tile-textures/IRIDIUM/Iridium Dubbo beige.png" },
    properties: { thickness: "10mm", tilesInBox: 4, longevity: "15+ years", application: "Floor" },
  },
  {
    title: "Iridium Friesland Silk",
    tileImage: "/assets/tile-textures/IRIDIUM/Iridium Friesland silk.png",
    size: "600x600mm",
    format: "600x600",
    material: "Porcelain",
    finish: "Glossy",
    pattern: "grid",
    grout: "#d0d4d8",
    price: 2000,
    rooms: ["kitchen", "bathroom", "living-room"],
    colors: ["#e0e4e8", "#c8ccd0"],
    texture: { kind: "image", src: "/assets/tile-textures/IRIDIUM/Iridium Friesland silk.png" },
    properties: { thickness: "10mm", tilesInBox: 4, longevity: "15+ years", application: "Floor" },
  },
  {
    title: "Iridium Kamplay Ivory",
    tileImage: "/assets/tile-textures/IRIDIUM/Iridium kamplay Ivory.png",
    size: "600x600mm",
    format: "600x600",
    material: "Porcelain",
    finish: "Matt",
    pattern: "grid",
    grout: "#d4ccc0",
    price: 1850,
    rooms: ["kitchen", "living-room", "bedroom"],
    colors: ["#e8dcc8", "#ccc0a8"],
    texture: { kind: "image", src: "/assets/tile-textures/IRIDIUM/Iridium kamplay Ivory.png" },
    properties: { thickness: "10mm", tilesInBox: 4, longevity: "15+ years", application: "Floor" },
  },
  {
    title: "Iridium Thorn White",
    tileImage: "/assets/tile-textures/IRIDIUM/Iridium Thorn White.png",
    size: "600x600mm",
    format: "600x600",
    material: "Porcelain",
    finish: "Glossy",
    pattern: "grid",
    grout: "#d8dce0",
    price: 2100,
    rooms: ["kitchen", "bathroom", "living-room"],
    colors: ["#f0f2f4", "#d8dce0"],
    texture: { kind: "image", src: "/assets/tile-textures/IRIDIUM/Iridium Thorn White.png" },
    properties: { thickness: "10mm", tilesInBox: 4, longevity: "15+ years", application: "Floor" },
  },
];

async function seed() {
  const connection = await connectDb();
  if (!connection) {
    throw new Error(
      "MONGODB_URI is not set. Add it to server/.env (see server/.env.example) and try again."
    );
  }

  await Promise.all([
    Admin.deleteMany({}),
    CategoryTemplate.deleteMany({}),
    Tile.deleteMany({}),
    Project.deleteMany({}),
    Room.deleteMany({}),
  ]);

  // 1. Admin
  const adminDoc = { username: ADMIN_USERNAME, name: "Admin", email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "superadmin" };
  const adminCheck = validate(AdminSchema, adminDoc);
  if (!adminCheck.ok) throw new Error(`Admin seed invalid: ${adminCheck.errors.join("; ")}`);
  const admin = await Admin.create({
    ...adminDoc,
    password: await bcrypt.hash(ADMIN_PASSWORD, 10),
  });

  // 2. Rooms (display metadata for the Rep-facing room selector)
  for (const doc of ROOM_SEED) {
    const check = validate(RoomSchema, doc);
    if (!check.ok) throw new Error(`Room "${doc.id}" invalid: ${check.errors.join("; ")}`);
  }
  const createdRooms = await Room.create(ROOM_SEED);

  // 3. Category templates (room × type)
  const templates = [];
  for (const room of ROOM_IDS) {
    for (const type of TEMPLATE_TYPES) {
      templates.push({ name: `${room} — ${type}`, room, type, isActive: true });
    }
  }
  for (const doc of templates) {
    const check = validate(CategoryTemplateSchema, doc);
    if (!check.ok) throw new Error(`Template "${doc.name}" invalid: ${check.errors.join("; ")}`);
  }
  const createdTemplates = await CategoryTemplate.create(templates);

  // 3. Tiles (each references the floor template of its primary room)
  const floorByRoom = new Map(
    createdTemplates
      .filter((t) => t.type === "floor")
      .map((t) => [t.room, t._id])
  );
  const tileDocs = TILE_SEED.map((tile) => ({
    ...tile,
    category: floorByRoom.get(tile.rooms[0]),
  }));
  for (const doc of tileDocs) {
    const check = validate(TileSchema, { ...doc, category: String(doc.category) });
    if (!check.ok) throw new Error(`Tile "${doc.title}" invalid: ${check.errors.join("; ")}`);
  }
  await Tile.create(tileDocs);

  console.log(
    `[seed] Done. Admin created | rooms: ${createdRooms.length} | templates: ${createdTemplates.length} | tiles: ${tileDocs.length}`
  );
  await disconnectDb();
}

seed().catch((err) => {
  console.error("[seed] Failed:", err?.message || err);
  process.exit(1);
});
