/**
 * Build validation for the shared workspace.
 *
 * Shared is plain ESM consumed directly by client (vite alias) and server
 * (npm workspace link), so there is nothing to compile. This script imports
 * every schema and exercises valid/invalid samples — a failed smoke means the
 * build is broken. Run via `npm run build --workspace shared`.
 */

import assert from "node:assert/strict";
import {
  AdminSchema,
  AdminLoginSchema,
  CategoryTemplateSchema,
  TileSchema,
  ProjectSchema,
  MongoObjectId,
  validate,
} from "../schemas/index.js";
import { validateLayout, createRoom } from "../schemas/layout.js";

const OID = "0123456789abcdef01234567";

const samples = [
  ["AdminSchema", AdminSchema, { username: "admin", name: "Admin", email: "admin@example.com", password: "password123", role: "superadmin" }],
  ["AdminLoginSchema", AdminLoginSchema, { username: "admin", password: "password123" }],
  ["CategoryTemplateSchema", CategoryTemplateSchema, { name: "Kitchen Floor", room: "kitchen", type: "floor" }],
  ["TileSchema", TileSchema, { title: "Iridium Aruba Armani", category: OID, size: "600x600mm", properties: {}, compatibleZones: ["floor", "wall"] }],
  ["ProjectSchema", ProjectSchema, { name: "Demo", adminId: OID, appliedTiles: { Floor: OID } }],
  ["MongoObjectId", MongoObjectId, OID],
];

for (const [label, schema, sample] of samples) {
  const result = schema.safeParse(sample);
  assert.ok(result.success, `${label} should accept a valid sample: ${JSON.stringify(result.error ?? null)}`);
}

assert.equal(validate(TileSchema, { title: "Missing category" }).ok, false, "validate() should reject missing category");
assert.ok(validateLayout(createRoom({ id: "x", name: "X", type: "photo", status: "draft" })).ok, "layout schema should accept a draft room");

console.log("[shared] all schemas validated OK");
