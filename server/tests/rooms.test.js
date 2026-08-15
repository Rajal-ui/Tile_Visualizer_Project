import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import jwt from "jsonwebtoken";
import { Room, Admin } from "../src/models/index.js";
import { JWT_SECRET } from "../src/config/env.js";

const ROOM_SEED = [
  { id: "living-room", name: "Living Room", isActive: true },
  { id: "kitchen", name: "Kitchen", isActive: true },
  { id: "hidden-room", name: "Hidden Room", isActive: false },
];

let roomStore = [];

const { default: app } = await import("../src/app.js");

let server;
let baseUrl;

const adminToken = jwt.sign({ id: "admin-001" }, JWT_SECRET, { expiresIn: "1h" });

test.before(() => {
  mock.method(Admin, "findById", (id) =>
    Promise.resolve(id === "admin-001" ? { _id: id, role: "admin", username: "roomadmin" } : null)
  );

  mock.method(Room, "find", (filter = {}) => {
    const results = roomStore.filter(
      (r) => filter.isActive === undefined || r.isActive === filter.isActive
    );
    return {
      sort() {
        return this;
      },
      lean() {
        return Promise.resolve([...results].sort((a, b) => a.name.localeCompare(b.name)));
      },
    };
  });

  mock.method(Room, "create", async (doc) => {
    const room = { ...doc };
    room.toJSON = () => ({ ...room });
    roomStore.push(room);
    return Promise.resolve(room);
  });
});

test.beforeEach(() => {
  roomStore = ROOM_SEED.map((r) => ({ ...r }));
});

test.before(async () => {
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  mock.restoreAll();
  server.close();
});

test("GET /api/v1/rooms lists only active rooms publicly", async () => {
  const res = await fetch(`${baseUrl}/api/v1/rooms`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.data));
  assert.equal(body.data.length, 2);
  assert.deepEqual(
    body.data.map((r) => r.id).sort(),
    ["kitchen", "living-room"]
  );
  assert.ok(body.data.every((r) => r.isActive === true));
});

test("POST /api/v1/rooms requires authentication", async () => {
  const res = await fetch(`${baseUrl}/api/v1/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: "bathroom", name: "Bathroom" }),
  });
  assert.equal(res.status, 401);
});

test("POST /api/v1/rooms rejects invalid payloads", async () => {
  const res = await fetch(`${baseUrl}/api/v1/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ name: "" }),
  });
  assert.equal(res.status, 400);
});

test("POST /api/v1/rooms creates a room as admin", async () => {
  const res = await fetch(`${baseUrl}/api/v1/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ id: "bathroom", name: "Bathroom" }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.data.id, "bathroom");
  assert.equal(body.data.name, "Bathroom");
  assert.equal(body.data.isActive, true);
  assert.ok(roomStore.some((r) => r.id === "bathroom"));
});
