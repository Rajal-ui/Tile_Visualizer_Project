import { createRoom, createZone, STATUS_DRAFT } from "@shared/schemas/layout.js";

/**
 * Photo-based room layouts (2-layer model).
 *
 * Canonical shape (see shared/schemas/layout.js):
 *
 *   Room {
 *     id, name, type ("photo" | "svg-scene"),
 *     background, foreground,
 *     zones: [{ id, label, planes: [{ polygon, corners }] }],
 *     status: "draft" | "published",
 *   }
 *
 *   background — room photo with furniture/objects removed (inpainted clean),
 *                bare floor/wall/counter visible only
 *   foreground — same canvas size, transparent except furniture/objects,
 *                ALWAYS drawn on top, unconditionally
 *   planes[].polygon — zone boundary points (compositor rasterizes to a feathered
 *                alpha mask at render time; no maskSrc PNGs in config)
 *   planes[].corners — 4-point perspective quad [[x,y] x4] for the homography warp
 *
 * Composite order (see canvas-compositor.js):
 *   background -> warped + masked tile per zone -> foreground on top.
 *
 * NOTE (Phase 0 audit): Kitchen IRIDIUM is FLAGGED FOR RE-CREATION. No zone
 * data exists in the repo — all corners are null and the legacy floor/wall/
 * counter mask PNGs were never committed alongside a config. Re-create
 * Floor/Wall/Counter via the polygon editor before publishing.
 */
export const layouts = [
  createRoom({
    id: "kitchen-iridium",
    name: "Kitchen IRIDIUM",
    type: "photo",
    background: "/assets/rooms/kitchen/background.png",
    foreground: "/assets/rooms/kitchen/foreground.png",
    status: STATUS_DRAFT,
    zones: [
      createZone({ id: "floor", label: "Floor" }),
      createZone({ id: "wall", label: "Wall" }),
      createZone({ id: "counter", label: "Counter" }),
    ],
  }),
];

export function getLayout(id) {
  return layouts.find((l) => l.id === id) || null;
}
