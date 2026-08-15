import { z } from "zod";
import { MongoObjectId } from "./id.schema.js";

/** Tile install properties (`tiles.properties`). */
export const TilePropertiesSchema = z.object({
  thickness: z.string().optional(),
  tilesInBox: z.number().int().nonnegative().optional(),
  longevity: z.string().optional(),
  application: z.string().optional(),
});

/** Supported tileable surfaces (zone compatibility). */
export const COMPATIBLE_ZONES = ["floor", "wall", "counter"];

/** Texture descriptor carried over from the static catalogue data. */
export const TileTextureSchema = z.object({
  kind: z.string().default("image"),
  src: z.string().optional(),
});

/** Tile document shape (`tiles` collection). */
export const TileSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: MongoObjectId,
  tileImage: z.union([z.string().url(), z.string().startsWith("/")]).optional(),
  description: z.string().optional(),
  properties: TilePropertiesSchema.default({}),
  size: z.string().optional(),
  material: z.string().optional(),
  finish: z.string().optional(),
  format: z.string().optional(),
  pattern: z.string().optional(),
  grout: z.string().optional(),
  price: z.number().nonnegative().optional(),
  sku: z.string().optional(),
  colorTag: z.string().optional(),
  compatibleZones: z.array(z.enum(COMPATIBLE_ZONES)).default([]),
  rooms: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  texture: TileTextureSchema.optional(),
});
