/**
 * Canonical layout configuration schema (Phase 1 data model).
 *
 * Replaces the old single-quad-per-zone shape:
 *
 *   OLD: zones: [{ id, label, maskSrc, corners }]
 *   NEW: zones: [{ id, label, planes: [{ polygon, corners }] }]
 *
 * A "plane" is one flat, tileable surface inside a zone. A zone can own multiple
 * planes (e.g. a bent / multi-segment wall), each with its own polygon boundary
 * and its own 4-corner perspective quad for the homography warp.
 *
 * The polygon is the source of truth for clipping: the compositor rasterizes a
 * plane's polygon into an alpha mask at render time (with a 1-3px feathered
 * edge). maskSrc PNGs are no longer part of the config — the backend may store
 * generated mask PNGs as derived artifacts only.
 *
 * Example:
 *   {
 *     id: "kitchen-iridium",
 *     name: "Kitchen IRIDIUM",
 *     type: "photo",
 *     background: "/api/layouts/kitchen-iridium/assets/background.png",
 *     foreground: "/api/layouts/kitchen-iridium/assets/foreground.png",
 *     status: "published",
 *     zones: [
 *       {
 *         id: "floor",
 *         label: "Floor",
 *         planes: [
 *           { polygon: [[0,0],[100,0],[100,80],[0,80]], corners: [[0,0],[100,0],[100,80],[0,80]] },
 *         ],
 *       },
 *     ],
 *   }
 */

export const ROOM_TYPES = ["photo", "svg-scene"];

export const ZONE_TYPES = ["floor", "wall", "counter"];

export const LAYOUT_STATUSES = ["draft", "published"];

export const STATUS_DRAFT = "draft";
export const STATUS_PUBLISHED = "published";

const isPoint = (p) =>
  Array.isArray(p) &&
  p.length >= 2 &&
  Number.isFinite(p[0]) &&
  Number.isFinite(p[1]);

/**
 * Create a plane definition.
 *
 * @param {Object}          opts
 * @param {number[][]}      opts.polygon  Boundary points [[x,y], ...] (>= 3).
 * @param {number[][]|null} [opts.corners] 4-corner perspective quad for the
 *        homography warp. For a simple quad this equals `polygon`; for complex
 *        polygons the admin places it separately. `null` means "no warp" (flat
 *        tile fill).
 * @returns {{polygon: number[][], corners: number[][]|null}}
 */
export function createPlane({ polygon, corners = null }) {
  return {
    polygon: polygon.map(([x, y]) => [Math.round(x), Math.round(y)]),
    corners: corners ? corners.map(([x, y]) => [Math.round(x), Math.round(y)]) : null,
  };
}

/**
 * Convenience factory: a simple quad plane whose polygon and perspective corners
 * are the same four points.
 */
export function planeFromQuad(corners) {
  return createPlane({ polygon: corners, corners });
}

/**
 * Create a zone definition.
 *
 * @param {Object}   opts
 * @param {string}   opts.id    e.g. "floor" | "wall" | "counter"
 * @param {string}   opts.label Display label, e.g. "Floor"
 * @param {Object[]} [opts.planes] Plane definitions (default []).
 */
export function createZone({ id, label, planes = [] }) {
  return { id, label, planes };
}

/**
 * Create a full room/layout definition.
 *
 * @param {Object} opts
 * @param {string} opts.id
 * @param {string} opts.name
 * @param {string} [opts.type="photo"]   "photo" | "svg-scene"
 * @param {string|null} [opts.background] Furniture-removed clean photo URL.
 * @param {string|null} [opts.foreground] Furniture-only, transparent elsewhere URL.
 * @param {Array}  [opts.zones=[]]
 * @param {string} [opts.status="draft"] "draft" | "published"
 */
export function createRoom({
  id,
  name,
  type = "photo",
  background = null,
  foreground = null,
  zones = [],
  status = STATUS_DRAFT,
}) {
  return { id, name, type, background, foreground, zones, status };
}

/**
 * Lightweight structural validator for a Room config. Plain JS, no dependencies,
 * safe to import from both client and server.
 *
 * @param {Object} room
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateLayout(room) {
  const errors = [];

  if (!room || typeof room !== "object") {
    return { ok: false, errors: ["room is not an object"] };
  }
  if (!room.id || typeof room.id !== "string") errors.push("room.id must be a non-empty string");
  if (!room.name || typeof room.name !== "string") errors.push("room.name must be a non-empty string");
  if (!ROOM_TYPES.includes(room.type)) errors.push(`room.type must be one of: ${ROOM_TYPES.join(", ")}`);
  if (!LAYOUT_STATUSES.includes(room.status)) errors.push(`room.status must be one of: ${LAYOUT_STATUSES.join(", ")}`);
  if (room.background != null && typeof room.background !== "string") errors.push("room.background must be a string URL or null");
  if (room.foreground != null && typeof room.foreground !== "string") errors.push("room.foreground must be a string URL or null");

  if (!Array.isArray(room.zones) || room.zones.length === 0) {
    errors.push("room.zones must be a non-empty array");
  } else {
    room.zones.forEach((zone, zi) => {
      const at = `zones[${zi}]`;
      if (!zone || typeof zone !== "object") return errors.push(`${at} must be an object`);
      if (!zone.id || typeof zone.id !== "string") errors.push(`${at}.id must be a non-empty string`);
      if (!zone.label || typeof zone.label !== "string") errors.push(`${at}.label must be a non-empty string`);
      if (ZONE_TYPES.length && !ZONE_TYPES.includes(zone.id)) {
        errors.push(`${at}.id should be one of: ${ZONE_TYPES.join(", ")}`);
      }
      if (!Array.isArray(zone.planes)) {
        errors.push(`${at}.planes must be an array`);
        return;
      }
      zone.planes.forEach((plane, pi) => {
        const atp = `${at}.planes[${pi}]`;
        if (!plane || typeof plane !== "object") return errors.push(`${atp} must be an object`);
        if (!Array.isArray(plane.polygon) || plane.polygon.length < 3) {
          errors.push(`${atp}.polygon must have at least 3 points`);
        } else if (!plane.polygon.every(isPoint)) {
          errors.push(`${atp}.polygon points must be [x, y] pairs of finite numbers`);
        }
        if (plane.corners != null) {
          if (!Array.isArray(plane.corners) || plane.corners.length !== 4 || !plane.corners.every(isPoint)) {
            errors.push(`${atp}.corners must be exactly 4 [x, y] points or null`);
          }
        }
      });
    });
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Migrate a legacy single-quad zone entry to the new planes[] shape.
 *
 * OLD: { id, label, maskSrc, corners }
 * NEW: { id, label, planes: [{ polygon, corners }] }
 *
 * A legacy zone with no corners cannot be auto-migrated (the old mask PNG would
 * need rasterizing back to points) — it returns an empty planes[] and must be
 * re-created in the polygon editor.
 */
export function migrateLegacyZone({ id, label, corners }) {
  if (Array.isArray(corners) && corners.length === 4 && corners.every(isPoint)) {
    return createZone({ id, label, planes: [planeFromQuad(corners)] });
  }
  return createZone({ id, label, planes: [] });
}
