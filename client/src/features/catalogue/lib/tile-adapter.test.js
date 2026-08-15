import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CATALOGUE_ZONE_TABS,
  isTileCompatibleWithSurface,
  surfaceToZoneKey,
} from "./tile-adapter.js";
import { tiles } from "../data/tiles.js";

const compatibleWith = (list, surface) => list.filter((t) => isTileCompatibleWithSurface(t, surface));

test("isTileCompatibleWithSurface — a tile without compatibleZones is compatible everywhere", () => {
  const unrestricted = { id: "x", compatibleZones: [] };
  assert.equal(isTileCompatibleWithSurface(unrestricted, "Floor"), true);
  assert.equal(isTileCompatibleWithSurface(unrestricted, "Wall"), true);
  assert.equal(isTileCompatibleWithSurface(unrestricted, "Accent Area"), true);
});

test("isTileCompatibleWithSurface — floor tiles match Floor but not Wall/Counter", () => {
  const aruba = tiles.find((t) => t.id === "tile-iridium-aruba-armani");
  assert.equal(isTileCompatibleWithSurface(aruba, "Floor"), true);
  assert.equal(isTileCompatibleWithSurface(aruba, "Wall"), false);
  assert.equal(isTileCompatibleWithSurface(aruba, "Counter"), false);
});

test("isTileCompatibleWithSurface — accent surfaces match wall-tagged tiles", () => {
  const thorn = tiles.find((t) => t.id === "tile-iridium-thorn-white");
  assert.equal(isTileCompatibleWithSurface(thorn, "Wall"), true);
  assert.equal(isTileCompatibleWithSurface(thorn, "Accent Wall"), true);
  assert.equal(isTileCompatibleWithSurface(thorn, "Accent Area"), true);
});

test("surfaceToZoneKey — canonical surfaces map to their catalogue tab", () => {
  assert.equal(surfaceToZoneKey("Floor"), "floor");
  assert.equal(surfaceToZoneKey("Wall"), "wall");
  assert.equal(surfaceToZoneKey("Counter"), "counter");
});

test("surfaceToZoneKey — accent and backsplash surfaces count as walls", () => {
  assert.equal(surfaceToZoneKey("Accent Wall"), "wall");
  assert.equal(surfaceToZoneKey("Accent Area"), "wall");
  assert.equal(surfaceToZoneKey("Backsplash"), "wall");
});

test("surfaceToZoneKey — unknown surfaces return null (no contextual filter)", () => {
  assert.equal(surfaceToZoneKey("Ceiling"), null);
  assert.equal(surfaceToZoneKey(""), null);
  assert.equal(surfaceToZoneKey(null), null);
});

test("contextual filtering — an accent surface narrows the seeded gallery to wall tiles", () => {
  const accentTiles = compatibleWith(tiles, "Accent Wall");
  assert.ok(accentTiles.length > 0 && accentTiles.length < tiles.length);
  assert.ok(accentTiles.every((t) => (t.compatibleZones || []).includes("wall")));
});

test("contextual filtering — the floor surface keeps every seeded floor tile", () => {
  const floorTiles = compatibleWith(tiles, "Floor");
  assert.equal(floorTiles.length, tiles.length);
});

test("surfaceToZoneKey + catalogue filter — switching surface changes the filtered set", () => {
  const wallSet = compatibleWith(tiles, surfaceToZoneKey("Wall"));
  const counterSet = compatibleWith(tiles, surfaceToZoneKey("Counter"));
  assert.notEqual(wallSet.length, counterSet.length);
  assert.ok(counterSet.length > 0);
  assert.ok(wallSet.length > counterSet.length);
});

test("catalogue zone tabs expose the keys surfaceToZoneKey returns", () => {
  const keys = CATALOGUE_ZONE_TABS.map((t) => t.key);
  assert.ok(keys.includes("floor"));
  assert.ok(keys.includes("wall"));
  assert.ok(keys.includes("counter"));
  assert.ok(keys.includes("all"));
});