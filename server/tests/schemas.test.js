import test from "node:test";
import assert from "node:assert/strict";
import {
  AdminSchema,
  CategoryTemplateSchema,
  TileSchema,
  ProjectSchema,
  MongoObjectId,
  validate,
} from "@tile-visualizer/shared/schemas/index.js";

const OID = "0123456789abcdef01234567";

test("shared Zod schemas accept valid documents", () => {
  assert.ok(
    AdminSchema.safeParse({
      username: "testadmin",
      name: "Admin",
      email: "admin@example.com",
      password: "password123",
      role: "superadmin",
    }).success
  );
  assert.ok(
    CategoryTemplateSchema.safeParse({ name: "Kitchen Floor", room: "kitchen", type: "floor" }).success
  );
  assert.ok(
    TileSchema.safeParse({ title: "Iridium Aruba Armani", category: OID, properties: {} }).success
  );
  assert.ok(
    ProjectSchema.safeParse({ name: "Demo", adminId: OID, appliedTiles: { Floor: OID } }).success
  );
});

test("shared Zod schemas reject invalid documents", () => {
  assert.equal(AdminSchema.safeParse({ email: "not-an-email" }).success, false);
  assert.equal(
    CategoryTemplateSchema.safeParse({ name: "X", room: "nope", type: "floor" }).success,
    false
  );
  assert.equal(TileSchema.safeParse({ title: "Missing category" }).success, false);
  assert.equal(MongoObjectId.safeParse("short").success, false);
  assert.equal(validate(TileSchema, { title: "Bad" }).ok, false);
});
