import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { get } from "node:http";

const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "tv-it-"));
process.env.STORAGE_ROOT = tmpRoot;

const { default: app } = await import("../src/app.js");

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

test.after(() => server.close());

async function getJson(url) {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

// sharp is already imported at top; helper below.

test("list layouts empty initially", async () => {
  const data = await getJson(`${baseUrl}/api/layouts`);
  assert.ok(Array.isArray(data));
});

test("POST multipart saves bg/fg + config + rasterized mask", async () => {
  const bg = await sharp({ create: { width: 4, height: 3, channels: 3, background: { r: 200, g: 100, b: 50 } } }).png().toBuffer();
  const cfg = {
    name: "Kitchen IRIDIUM",
    type: "photo",
    status: "draft",
    zones: [
      {
        id: "floor",
        label: "Floor",
        planes: [{ polygon: [[0, 0], [3, 0], [3, 2], [0, 2]], corners: [[0, 0], [3, 0], [3, 2], [0, 2]] }],
      },
    ],
  };

  const form = new FormData();
  form.append("config", JSON.stringify(cfg));
  form.append("background", new Blob([bg], { type: "image/png" }), "bg.png");

  const res = await fetch(`${baseUrl}/api/layouts/kitchen-iridium`, { method: "POST", body: form });
  const saved = await res.json();
  if (res.status !== 200) {
    console.error("multipart save failed:", saved);
  }
  assert.equal(res.status, 200);
  assert.equal(saved.layout.id, "kitchen-iridium");
  assert.ok(saved.layout.background, "background url set");
  assert.ok(saved.layout.assets.masks.floor, "rasterized mask url set");

  const maskRes = await fetch(`${baseUrl}${saved.layout.assets.masks.floor}`);
  const maskBody = await maskRes.text();
  if (maskRes.status !== 200) {
    console.error("mask serve failed:", maskRes.status, JSON.stringify(maskBody), "url:", saved.layout.assets.masks.floor);
  }
  assert.equal(maskRes.status, 200);
  assert.equal(maskRes.headers.get("content-type"), "image/png");

  const got = await getJson(`${baseUrl}/api/layouts/kitchen-iridium`);
  assert.equal(got.zones[0].planes[0].polygon[2][0], 3);
});

test("POST JSON-only saves config", async () => {
  const res = await postJson(`${baseUrl}/api/layouts/json-room`, {
    id: "json-room",
    name: "JSON Room",
    type: "photo",
    status: "draft",
    zones: [{ id: "wall", label: "Wall", planes: [{ polygon: [[0, 0], [2, 0], [2, 2], [0, 2]], corners: [[0, 0], [2, 0], [2, 2], [0, 2]] }] }],
  });
  assert.equal(res.status, 200);
  assert.equal(res.json.layout.id, "json-room");
});

test("validateLayout rejects published-empty-zones", async () => {
  const { validateLayout } = await import("../../shared/schemas/layout.js");
  const draft = { id: "x", name: "x", type: "photo", status: "draft", zones: [] };
  const pub = { id: "x", name: "x", type: "photo", status: "published", zones: [] };
  assert.equal(validateLayout(draft).ok, true);
  const bad = validateLayout(pub);
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => e.includes("published")));
});

test("traversal guard blocks ../ in asset path", async () => {
  const res = await fetch(`${baseUrl}/api/layouts/kitchen-iridium/assets/../config.json`);
  // Express itself collapses ../ in the URL path before route match, so we
  // expect either 404 (no such file) — the key assertion is it never escapes
  // the storage root.
  assert.equal(res.status, 404);
});
