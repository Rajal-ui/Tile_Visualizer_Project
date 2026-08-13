import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import jwt from "jsonwebtoken";
import { Tile, CategoryTemplate, Admin } from "../src/models/index.js";
import { JWT_SECRET } from "../src/config/env.js";

const CAT_FLOOR = "c00000000000000000000001";
const CAT_WALL = "c00000000000000000000002";

const CATEGORY_SEED = [
  { _id: CAT_FLOOR, name: "kitchen — floor", room: "kitchen", type: "floor", isActive: true },
  { _id: CAT_WALL, name: "bathroom — wall", room: "bathroom", type: "wall", isActive: true },
];

const TILE_SEED = [
  {
    _id: "a00000000000000000000001",
    title: "Iridium Aruba Armani",
    category: CAT_FLOOR,
    size: "600x600mm",
    material: "Porcelain",
    finish: "Matt",
    price: 1800,
    rooms: ["kitchen", "living-room", "bathroom"],
  },
  {
    _id: "a00000000000000000000002",
    title: "Iridium Friesland Silk",
    category: CAT_FLOOR,
    size: "600x600mm",
    material: "Porcelain",
    finish: "Glossy",
    price: 2000,
    rooms: ["kitchen", "bathroom"],
  },
  {
    _id: "a00000000000000000000003",
    title: "Iridium Thorn White",
    category: CAT_WALL,
    size: "600x600mm",
    material: "Porcelain",
    finish: "Glossy",
    price: 2100,
    rooms: ["bathroom"],
  },
  {
    _id: "a00000000000000000000004",
    title: "Antique Oak Plank",
    category: CAT_FLOOR,
    size: "200x1200mm",
    material: "Wood",
    finish: "Rustic",
    price: 2500,
    rooms: ["living-room", "bedroom"],
  },
];

let tileStore = [];
let categoryStore = [];
let nextId = 0x100;

/** Stand-in for a Mongoose filter — mirrors the route's query construction. */
function tileMatches(tile, filter = {}) {
  if (filter.category && String(tile.category) !== String(filter.category)) return false;
  if (filter.rooms && !(tile.rooms || []).includes(filter.rooms)) return false;
  if (filter.size && tile.size !== filter.size) return false;
  if (filter.material && tile.material !== filter.material) return false;
  if (filter.finish && tile.finish !== filter.finish) return false;
  if (filter.$text && filter.$text.$search) {
    const q = String(filter.$text.$search).toLowerCase();
    const haystack = [tile.title, tile.material, tile.finish, tile.size]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

const adminToken = jwt.sign({ id: "admin-001" }, JWT_SECRET, { expiresIn: "1h" });
const viewerToken = jwt.sign({ id: "viewer-001" }, JWT_SECRET, { expiresIn: "1h" });

const { default: app } = await import("../src/app.js");

let server;
let baseUrl;

test.before(() => {
  mock.method(Admin, "findById", (id) => {
    const users = [
      { _id: "admin-001", role: "admin", username: "tileadmin" },
      { _id: "viewer-001", role: "viewer", username: "viewer" },
    ];
    return Promise.resolve(users.find((u) => u._id === id) || null);
  });

  mock.method(Tile, "find", (filter = {}) => {
    const results = tileStore.filter((t) => tileMatches(t, filter));
    return {
      sort() {
        return this;
      },
      skip(n) {
        this._skip = n;
        return this;
      },
      limit(n) {
        this._limit = n;
        return this;
      },
      lean() {
        const start = this._skip || 0;
        const end = start + (this._limit ?? results.length);
        return Promise.resolve(results.slice(start, end));
      },
    };
  });

  mock.method(Tile, "countDocuments", (filter = {}) =>
    Promise.resolve(tileStore.filter((t) => tileMatches(t, filter)).length)
  );

  mock.method(Tile, "findById", (id) => {
    const tile = tileStore.find((t) => t._id === id) || null;
    return { lean: () => Promise.resolve(tile) };
  });

  mock.method(Tile, "create", (doc) => {
    const now = new Date().toISOString();
    const tile = {
      ...doc,
      _id: nextId.toString(16).padStart(24, "0"),
      createdAt: now,
      updatedAt: now,
    };
    tileStore.push(tile);
    return Promise.resolve(tile);
  });

  mock.method(Tile, "findByIdAndUpdate", (id, update) => {
    const idx = tileStore.findIndex((t) => t._id === id);
    if (idx === -1) return { lean: () => Promise.resolve(null) };
    const updated = { ...tileStore[idx], ...update, updatedAt: new Date().toISOString() };
    tileStore[idx] = updated;
    return { lean: () => Promise.resolve(updated) };
  });

  mock.method(Tile, "findByIdAndDelete", (id) => {
    const idx = tileStore.findIndex((t) => t._id === id);
    if (idx === -1) return Promise.resolve(null);
    const [removed] = tileStore.splice(idx, 1);
    return Promise.resolve(removed);
  });

  mock.method(CategoryTemplate, "findById", (id) => {
    const cat = categoryStore.find((c) => c._id === id) || null;
    return { lean: () => Promise.resolve(cat) };
  });
});

test.beforeEach(() => {
  tileStore = TILE_SEED.map((t) => ({ ...t }));
  categoryStore = CATEGORY_SEED.map((c) => ({ ...c }));
  nextId = 0x100;
});

test.before(async () => {
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  mock.restoreAll();
  server.close();
});

async function requestJson(url, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Cookie = `jwt=${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

// ---------------------------------------------------------------------------
// Public listing, filters and pagination
// ---------------------------------------------------------------------------

test("GET /api/v1/tiles lists tiles publicly with default pagination", async () => {
  const res = await requestJson(`${baseUrl}/api/v1/tiles`);
  assert.equal(res.status, 200);
  assert.equal(res.json.data.length, 4);
  assert.equal(res.json.pagination.page, 1);
  assert.equal(res.json.pagination.limit, 20);
  assert.equal(res.json.pagination.totalItems, 4);
  assert.equal(res.json.pagination.totalPages, 1);
});

test("GET /api/v1/tiles supports limit and page pagination", async () => {
  const page1 = await requestJson(`${baseUrl}/api/v1/tiles?limit=2&page=1`);
  assert.equal(page1.status, 200);
  assert.equal(page1.json.data.length, 2);
  assert.equal(page1.json.pagination.page, 1);
  assert.equal(page1.json.pagination.limit, 2);
  assert.equal(page1.json.pagination.totalItems, 4);
  assert.equal(page1.json.pagination.totalPages, 2);

  const page2 = await requestJson(`${baseUrl}/api/v1/tiles?limit=2&page=2`);
  assert.equal(page2.status, 200);
  assert.equal(page2.json.data.length, 2);
  assert.equal(page2.json.pagination.page, 2);
});

test("GET /api/v1/tiles filters by room, material, finish and size", async () => {
  const byRoom = await requestJson(`${baseUrl}/api/v1/tiles?room=kitchen`);
  assert.equal(byRoom.json.data.length, 2);
  assert.ok(byRoom.json.data.every((t) => t.rooms.includes("kitchen")));

  const byMaterial = await requestJson(`${baseUrl}/api/v1/tiles?material=Porcelain`);
  assert.equal(byMaterial.json.data.length, 3);

  const byFinish = await requestJson(`${baseUrl}/api/v1/tiles?finish=Glossy`);
  assert.equal(byFinish.json.data.length, 2);

  const bySize = await requestJson(`${baseUrl}/api/v1/tiles?size=200x1200mm`);
  assert.equal(bySize.json.data.length, 1);
  assert.equal(bySize.json.data[0].title, "Antique Oak Plank");
});

test("GET /api/v1/tiles filters by category and combines filters", async () => {
  const byCategory = await requestJson(`${baseUrl}/api/v1/tiles?category=${CAT_WALL}`);
  assert.equal(byCategory.json.data.length, 1);
  assert.equal(byCategory.json.data[0].title, "Iridium Thorn White");

  const combined = await requestJson(`${baseUrl}/api/v1/tiles?room=bathroom&finish=Matt`);
  assert.equal(combined.json.data.length, 1);
  assert.equal(combined.json.data[0].title, "Iridium Aruba Armani");

  const empty = await requestJson(`${baseUrl}/api/v1/tiles?room=staircase`);
  assert.equal(empty.json.data.length, 0);
  assert.equal(empty.json.pagination.totalItems, 0);
});

test("GET /api/v1/tiles rejects a malformed category filter with 400", async () => {
  const res = await requestJson(`${baseUrl}/api/v1/tiles?category=not-an-oid`);
  assert.equal(res.status, 400);
  assert.ok(res.json.error);
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

test("GET /api/v1/tiles/search requires a q parameter", async () => {
  const missing = await requestJson(`${baseUrl}/api/v1/tiles/search`);
  assert.equal(missing.status, 400);
  assert.match(missing.json.error, /q/i);

  const empty = await requestJson(`${baseUrl}/api/v1/tiles/search?q=`);
  assert.equal(empty.status, 400);
});

test("GET /api/v1/tiles/search matches title, material, finish and size", async () => {
  const byTitle = await requestJson(`${baseUrl}/api/v1/tiles/search?q=Aruba`);
  assert.equal(byTitle.status, 200);
  assert.equal(byTitle.json.data.length, 1);
  assert.equal(byTitle.json.data[0].title, "Iridium Aruba Armani");

  const byMaterial = await requestJson(`${baseUrl}/api/v1/tiles/search?q=porcelain`);
  assert.equal(byMaterial.json.data.length, 3);

  const byFinish = await requestJson(`${baseUrl}/api/v1/tiles/search?q=Glossy`);
  assert.equal(byFinish.json.data.length, 2);

  const bySize = await requestJson(`${baseUrl}/api/v1/tiles/search?q=600x600mm`);
  assert.equal(bySize.json.data.length, 3);
});

test("GET /api/v1/tiles/search returns empty data for no matches", async () => {
  const res = await requestJson(`${baseUrl}/api/v1/tiles/search?q=zzzzz`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.data, []);
  assert.equal(res.json.pagination.totalItems, 0);
  assert.equal(res.json.pagination.totalPages, 0);
});

// ---------------------------------------------------------------------------
// Single tile detail
// ---------------------------------------------------------------------------

test("GET /api/v1/tiles/:id returns a tile publicly", async () => {
  const res = await requestJson(`${baseUrl}/api/v1/tiles/a00000000000000000000001`);
  assert.equal(res.status, 200);
  assert.equal(res.json.data.title, "Iridium Aruba Armani");
  assert.equal(res.json.data.category, CAT_FLOOR);
});

test("GET /api/v1/tiles/:id returns 404 for invalid or missing ids", async () => {
  const invalid = await requestJson(`${baseUrl}/api/v1/tiles/not-a-valid-id`);
  assert.equal(invalid.status, 404);
  assert.ok(invalid.json.error);

  const missing = await requestJson(`${baseUrl}/api/v1/tiles/a00000000000000000000099`);
  assert.equal(missing.status, 404);
  assert.ok(missing.json.error);
});

// ---------------------------------------------------------------------------
// Authorization guards (401 / 403)
// ---------------------------------------------------------------------------

test("unauthenticated writes to /api/v1/tiles are rejected with 401", async () => {
  const body = { title: "X", category: CAT_FLOOR };

  const post = await requestJson(`${baseUrl}/api/v1/tiles`, { method: "POST", body });
  assert.equal(post.status, 401);

  const patch = await requestJson(`${baseUrl}/api/v1/tiles/a00000000000000000000001`, {
    method: "PATCH",
    body: { price: 999 },
  });
  assert.equal(patch.status, 401);

  const del = await requestJson(`${baseUrl}/api/v1/tiles/a00000000000000000000001`, {
    method: "DELETE",
  });
  assert.equal(del.status, 401);
});

test("non-admin authenticated writes to /api/v1/tiles are rejected with 403", async () => {
  const body = { title: "X", category: CAT_FLOOR };

  const post = await requestJson(`${baseUrl}/api/v1/tiles`, {
    method: "POST",
    body,
    token: viewerToken,
  });
  assert.equal(post.status, 403);

  const patch = await requestJson(`${baseUrl}/api/v1/tiles/a00000000000000000000001`, {
    method: "PATCH",
    body: { price: 999 },
    token: viewerToken,
  });
  assert.equal(patch.status, 403);

  const del = await requestJson(`${baseUrl}/api/v1/tiles/a00000000000000000000001`, {
    method: "DELETE",
    token: viewerToken,
  });
  assert.equal(del.status, 403);
});

// ---------------------------------------------------------------------------
// Admin write operations
// ---------------------------------------------------------------------------

test("admin can create a tile", async () => {
  const res = await requestJson(`${baseUrl}/api/v1/tiles`, {
    method: "POST",
    token: adminToken,
    body: {
      title: "Iridium Carrara",
      category: CAT_FLOOR,
      material: "Porcelain",
      finish: "Polished",
      size: "600x1200mm",
      price: 2600,
      rooms: ["living-room"],
    },
  });
  assert.equal(res.status, 201);
  assert.equal(res.json.data.title, "Iridium Carrara");
  assert.equal(res.json.data.category, CAT_FLOOR);
});

test("admin create validates required fields (400 with { error })", async () => {
  const noTitle = await requestJson(`${baseUrl}/api/v1/tiles`, {
    method: "POST",
    token: adminToken,
    body: { category: CAT_FLOOR },
  });
  assert.equal(noTitle.status, 400);
  assert.ok(noTitle.json.error);

  const noCategory = await requestJson(`${baseUrl}/api/v1/tiles`, {
    method: "POST",
    token: adminToken,
    body: { title: "X" },
  });
  assert.equal(noCategory.status, 400);
  assert.ok(noCategory.json.error);

  const badCategory = await requestJson(`${baseUrl}/api/v1/tiles`, {
    method: "POST",
    token: adminToken,
    body: { title: "X", category: "short" },
  });
  assert.equal(badCategory.status, 400);
  assert.match(badCategory.json.error, /ObjectId/);
});

test("admin create rejects an unknown category reference", async () => {
  const res = await requestJson(`${baseUrl}/api/v1/tiles`, {
    method: "POST",
    token: adminToken,
    body: { title: "Ghost Tile", category: "c00000000000000000000099" },
  });
  assert.equal(res.status, 400);
  assert.match(res.json.error, /Category does not exist/);
});

test("admin can update a tile", async () => {
  const res = await requestJson(`${baseUrl}/api/v1/tiles/a00000000000000000000001`, {
    method: "PATCH",
    token: adminToken,
    body: { price: 1750, finish: "Satin" },
  });
  assert.equal(res.status, 200);
  assert.equal(res.json.data.title, "Iridium Aruba Armani");
  assert.equal(res.json.data.price, 1750);
  assert.equal(res.json.data.finish, "Satin");
});

test("admin update validates the payload and handles missing tiles", async () => {
  const invalid = await requestJson(`${baseUrl}/api/v1/tiles/a00000000000000000000001`, {
    method: "PATCH",
    token: adminToken,
    body: { price: -5 },
  });
  assert.equal(invalid.status, 400);
  assert.ok(invalid.json.error);

  const missing = await requestJson(`${baseUrl}/api/v1/tiles/a00000000000000000000099`, {
    method: "PATCH",
    token: adminToken,
    body: { price: 100 },
  });
  assert.equal(missing.status, 404);
  assert.ok(missing.json.error);
});

test("admin can delete a tile and it is gone afterwards", async () => {
  const del = await requestJson(`${baseUrl}/api/v1/tiles/a00000000000000000000001`, {
    method: "DELETE",
    token: adminToken,
  });
  assert.equal(del.status, 204);
  assert.equal(del.json, null);

  const again = await requestJson(`${baseUrl}/api/v1/tiles/a00000000000000000000001`, {
    method: "DELETE",
    token: adminToken,
  });
  assert.equal(again.status, 404);

  const get = await requestJson(`${baseUrl}/api/v1/tiles/a00000000000000000000001`);
  assert.equal(get.status, 404);
});
