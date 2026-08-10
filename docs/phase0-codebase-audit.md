# Phase 0 — Codebase Audit

> **Update (cleanup pass):** the `legacy/` archive, the dead `LayoutSelector.jsx`,
> the unused `layouts/data/surfaces.js`, the unused env S3 block, and the schema's
> legacy migration helpers (`planeFromQuad`, `migrateLegacyZone`) were removed.
> Nothing in the active codebase imports them.

Date: 2026-08-10. Branch: `issue-6-rebuild-tile-visualizer-architecture`.
Monorepo workspaces: `client` (Vite + React 18 + Tailwind), `server` (Express 4, `multer` + `sharp` + `replicate` deps installed), `shared` (empty scaffold). No router — `App.jsx` conditionally renders `Login` vs `Dashboard`. Auth is frontend-only, hardcoded (`admin` / `admin123`, `auth.constants.js`).

## Verdict per audited area

### rooms.jsx / layouts data
- `client/src/features/rooms/data/rooms.jsx` — 6 static rooms. Five (living-room, bedroom, bathroom, staircase, facade) are **CSS-perspective** rooms with `bg`/`fg`/`floor{perspective,rotateX,scaleX,scaleY,translateY,tileSize}`. Kitchen is the only **photo-layout** room (`layout: "kitchen-iridium"`), has no `bg`/`fg`/`floor`. Branching is by presence of `room.layout` — there is no `type` field today.
- `client/src/features/rooms/data/layouts.js` — only `kitchen-iridium`: `{ id, name, background, foreground, zones: [{ id, label, maskSrc, corners }] }`. **All three zones have `corners: null`** and `maskSrc` points at `/assets/rooms/kitchen/{floor,wall,counter}-mask.png` — **none of those mask files exist on disk**. The compositor skips zones without a mask, so Kitchen currently renders as a bare background with no tiles.
- Note: the roadmap's "SVG-scene rooms (Living Room, Bedroom…)" are, in this codebase, the **CSS-perspective PhotoViewer path** (bg.jpg + CSS-3D tile layer + fg.png). No literal SVG scene renderer exists in the active client. Leaving those untouched = leaving `PhotoViewer`/`rooms.jsx` floor params untouched.

### canvas-compositor.js (client/src/features/visualizer/lib/canvas-compositor.js, 208 ln)
Current order is already correct: background → per-zone (warp tile → clip to mask → multiply background luminosity) → foreground. Already has: homography warp (`warpTextureToQuad` when `corners.length===4`), mask feather via 2px Gaussian blur, grayscale shading layer multiplied back (`lightMultiply 0.55`), material resolved from `appliedTiles` by label.
**Rework needed:** mask source (external PNG) → rasterize from polygon points; single per-zone quad → per-plane; fixed hard luminance threshold (>128) → antialiased; feather hardcoded 2px → 1–3px; no multi-plane support; `corners`/`maskSrc` shape change.

### homography.js (client/src/features/visualizer/lib/homography.js, 165 ln)
`getHomography` (Gaussian elimination), `transformPoint`, `warpTextureToQuad` (reverse-mapped per-pixel sampling with `%tw/%th` texture repeat + point-in-quad test). **Fully reusable as-is.** One caveat to verify in QA: single texture tile is stretched across the quad with modulo repeat, so texture scale is implicit per quad.

### LayoutEditor.jsx (client/src/features/layouts/pages/LayoutEditor.jsx, 442 ln)
Brush/erase freehand painting (`paintAt`/`paintLine`, `source-over`/`destination-out`) + fixed 4-corner click tool. Saves by **downloading** each mask PNG and a config JSON to the desktop (`a.click()` per file). Hardcodes `/assets/rooms/kitchen/*-mask.png`. Overlay tint = saturated `ZONE_COLORS` (`#f59e0b,#3b82f6,#10b981,#8b5cf6`) at 0.45 alpha. No Save-Draft/Publish, no multi-plane, no backend call. → full rewrite.

### Visualizer.jsx / RoomCanvas.jsx
- `Visualizer.jsx` branches: `room.layout ? <RoomCanvas/> : <PhotoViewer/>`. `PhotoViewer` = untouched CSS path. Gets layout synchronously via `getLayout()`.
- `RoomCanvas.jsx` already renders dynamic zone tabs from `layout.zones` and calls `compositeAllZones`. Target: fetch config from backend, pass polygon/plane data.

### Backend / API
**None.** `server/src/app.js` mounts only `/` and `/health`; `server/src/config/env.js` only `PORT`/`NODE_ENV`; all module dirs (controllers/services/models/repositories/validators/middleware/utils) are `.gitkeep` placeholders. **Confirmed: building persistence from zero.** The legacy router `legacy/server/src/routes/admin.js` (segment + save-layout + get layouts, writing into `client/public/assets/room-layouts`) is archived and unmounted — a useful reference for the multer+sharp save pattern only.

### Asset storage
All assets are local static files under `client/public/`:
- Kitchen: `assets/rooms/kitchen/background.png` + `foreground.png`, both 1728×910. **No mask PNGs exist.**
- Tile textures: `assets/tile-textures/IRIDIUM/*.png` (6), referenced by `tile.texture.src` in `catalogue/data/tiles.js`.
- Other rooms: `assets/rooms/<id>/bg.jpg` + `fg.png`.
- **No cloud storage config anywhere** (no S3/cloud env vars).
- Legacy IRIDIUM masks (`wall-mask.png`, `floor-mask.png`, `counter-mask.png`, 1728×910) exist **only in git history** (tree of commit 3764ac3). `floor-mask` was deleted from the index; `wall/counter` were staged-moved to `legacy/` but are also deleted from the worktree. **No `config.json` with Wall corners was ever committed** — the "Wall corners are set" state is not present anywhere in the repo; Floor/Wall/Counter must all be re-created via the new polygon tool. The legacy `wall-mask.png` is recoverable from git as a reference.

## File inventory (current → target)

| File | Current | Target | Phase |
|---|---|---|---|
| `client/src/features/rooms/data/layouts.js` | Static single layout, all zones empty | Deleted or gutted — config served by backend; kitchen seeded from stored JSON | 1, 2 |
| `shared/schemas/*` | Empty `.gitkeep` | Canonical Room/Zone/Plane schema (JS module, imported by client+server) | 1 |
| `server/src/routes/layouts.js` (new) | — | `GET /api/layouts`, `GET/POST/PATCH /api/layouts/:roomId` (save all zones in one call, set draft/published) | 2 |
| `server/src/controllers/layouts.js` (new) | — | Validation, orchestration | 2 |
| `server/src/services/layout-storage.js` (new) | — | Local disk storage (S3-ready interface) for bg/fg PNGs + generated mask PNGs + config.json | 2 |
| `server/src/config/env.js` | PORT/NODE_ENV only | + storage root / S3 opts | 2 |
| `server/src/app.js` | `/`, `/health` | Mount layouts router | 2 |
| `client/src/services/layouts.api.js` (new) | — | Client fetch wrapper for layout CRUD | 2, 6 |
| `client/src/features/layouts/pages/LayoutEditor.jsx` | Brush/erase + 4-corner + desktop download | Click-to-place N-point polygon tool, multi sub-plane per zone, per-plane corners, neutral low-opacity overlay, Save Draft / Publish via API | 3 |
| `client/src/features/visualizer/lib/canvas-compositor.js` | maskSrc+single-quad | Polygon-rasterized masks, per-plane warp+clip, 1–3px feather, shading multiply (keep), foreground last (keep) | 5 |
| `client/src/features/visualizer/lib/polygon.js` (new) | — | Point-in-polygon + rasterize polygon → feathered alpha mask | 5 |
| `client/src/features/visualizer/pages/RoomCanvas.jsx` | sync layout prop | Fetch config from backend; pass planes | 6 |
| `client/src/features/visualizer/pages/Visualizer.jsx` | `getLayout()` sync | Backend-sourced layout; keep PhotoViewer branch untouched | 6 |
| `client/src/store/workspace.context.jsx` | localStorage prefs + sync getLayout | Backend-sourced layouts; keep applied-tile prefs in localStorage | 6 |
| `client/src/features/dashboard/pages/Dashboard.jsx` | Single "Editor" button | Admin Panel → Layouts → list → "+ New Layout" (onboarding: upload bg/fg → zone editor → live preview → publish) | 4 |
| `client/src/features/layouts/pages/LayoutOnboarding.jsx` (new) | — | Step wizard (upload / edit / preview / publish) | 4 |
| `client/src/features/layouts/pages/LayoutList.jsx` (new) | — | Admin list of layouts w/ draft/published | 4 |
| `client/src/features/rooms/components/RoomSelector.jsx` | static rooms array | Merge backend layouts (published) with static rooms | 4, 6 |
| `client/src/features/catalogue/components/TileSwapPanel.jsx` | writes appliedTiles per surface | No functional change required (verify) | 6 |
| `client/src/features/layouts/components/LayoutSelector.jsx` | — | Dead code — **removed in cleanup** | — |
| `client/src/features/catalogue/data/tiles.js`, `lib/textures.js`, `visualizer/lib/homography.js`, `features/visualizer/pages/Visualizer.jsx` (PhotoViewer), `features/rooms/data/rooms.jsx` (non-kitchen entries) | — | Untouched (SVG/CSS-scene path) | — |
| `docs/architecture.md`, `docs/api.md` | describe old static model | Update after implementation | ongoing |

## Open issues / not accounted-for items
1. **Kitchen has zero usable zone data** — Wall corners the user referenced don't exist in the repo. All 3 zones re-created via new tool; legacy wall-mask recoverable from git as reference.
2. **No cloud storage creds** — need decision: local-disk storage now (S3-ready interface) vs wait for S3.
3. **API surface** — roadmap names `POST/GET /api/layouts/:roomId`; onboarding also needs `GET /api/layouts` (list) and a publish action.
4. **Auth** — `POST /api/layouts` will be unauthenticated unless auth moves to backend (out of current scope; flag for later).
5. **Mask PNGs on save** — roadmap wants generated mask PNGs stored server-side (sharp); compositor will use polygons as source of truth.
6. **Texture scale per plane** — compositor's tile repeat is implicit per quad; QA item for Kitchen.
