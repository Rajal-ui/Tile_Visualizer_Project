import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import { Room } from "../src/models/index.js";

const ROOM_SEED = [
  { id: "living-room", name: "Living Room", isActive: true },
  { id: "kitchen", name: "Kitchen", isActive: true },
  { id: "hidden-room", name: "Hidden Room", isActive: false },
];

let roomStore = [];

const { default: app } = await import("../src/app.js");

let server;
let baseUrl;

test.before(() => {
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
