import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import jwt from "jsonwebtoken";
import path from "node:path";
import os from "node:os";
import mongoose from "mongoose";
import { Layout, Admin } from "../src/models/index.js";
import { JWT_SECRET } from "../src/config/env.js";

// Point the storage singleton at a throwaway temp dir and skip the legacy
// filesystem migration (readyState 0 short-circuits it).
process.env.STORAGE_ROOT = path.join(os.tmpdir(), `tv-layout-status-${Date.now()}`);
mongoose.connection.readyState = 0;

let store = {};

const { default: app } = await import("../src/app.js");

let server;
let baseUrl;
const adminToken = jwt.sign({ id: "admin-001" }, JWT_SECRET, { expiresIn: "1h" });

function makeLayout(overrides = {}) {
  return {
    id: "kitchen-iridium",
    name: "Kitchen IRIDIUM",
    type: "photo",
    roomId: "kitchen",
    status: "draft",
    background: "/api/layouts/kitchen-iridium/assets/background.png",
    foreground: "/api/layouts/kitchen-iridium/assets/foreground.png",
    zones: [
      {
        id: "floor",
        label: "Floor",
        planes: [{ polygon: [[0, 560], [1728, 560], [1728, 910], [0, 910]], corners: null }],
      },
    ],
    assets: { masks: {} },
    ...overrides,
  };
}

test.before(() => {
  mock.method(Admin, "findById", (id) =>
    Promise.resolve(id === "admin-001" ? { _id: id, role: "admin", username: "layoutadmin" } : null)
  );

  mock.method(Layout, "findOne", async (query) => {
    const doc = store[query.id];
    return Promise.resolve(doc ? { toJSON: () => ({ ...doc }) } : null);
  });

  mock.method(Layout, "findOneAndUpdate", async (query, update) => {
    const doc = { ...(store[query.id] || {}), ...update.$set };
    doc.toJSON = () => ({ ...doc });
    store[query.id] = doc;
    return Promise.resolve(doc);
  });

  mock.method(Layout, "find", () => ({ lean: () => Promise.resolve([]) }));
});

test.beforeEach(() => {
  store = { "kitchen-iridium": makeLayout() };
});

test.before(async () => {
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  mock.restoreAll();
  server.close();
});

function patch(id, body, token) {
  return fetch(`${baseUrl}/api/layouts/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

test("PATCH /api/layouts/:id is reachable without a token and still validates input", async () => {
  const res = await patch("kitchen-iridium", { status: "live" });
  assert.equal(res.status, 400);
});

test("PATCH /api/layouts/:id rejects an invalid status", async () => {
  const res = await patch("kitchen-iridium", { status: "live" }, adminToken);
  assert.equal(res.status, 400);
});

test("PATCH /api/layouts/:id refuses to publish without completed planes", async () => {
  store["kitchen-iridium"] = makeLayout({
    zones: [{ id: "floor", label: "Floor", planes: [] }],
  });
  const res = await patch("kitchen-iridium", { status: "published" }, adminToken);
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.error, /at least one completed plane/);
});

test("PATCH /api/layouts/:id publishes a valid draft", async () => {
  const res = await patch("kitchen-iridium", { status: "published" }, adminToken);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.data.id, "kitchen-iridium");
  assert.equal(body.data.status, "published");
  assert.equal(store["kitchen-iridium"].status, "published");
});

test("PATCH /api/layouts/:id can revert a published layout to draft", async () => {
  store["kitchen-iridium"] = makeLayout({ status: "published" });
  const res = await patch("kitchen-iridium", { status: "draft" }, adminToken);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.status, "draft");
});

test("PATCH /api/layouts/:id returns 404 for an unknown layout", async () => {
  const res = await patch("missing-room", { status: "published" }, adminToken);
  assert.equal(res.status, 404);
});
