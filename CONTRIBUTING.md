# Contributing to Tile Visualizer Project

Welcome, and thank you for considering a contribution to the **Tile Visualizer Project** — the digital tile catalogue and room visualizer used by the sales team to present tile options to customers in real time.

This document is the single source of truth for contributing. It covers local development setup, the architecture and rendering pipeline, how mock data and canvas assets are structured, the API surface, the contribution workflow (branching, issues, pull requests), and how to verify your work before you open a PR.

Whether you are fixing a rendering bug in the compositor, adding a tile to the catalogue, or wiring up a new backend module, please read this guide before you start.

---

## Table of Contents

1. [Development Setup](#1-development-setup)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack](#3-tech-stack)
4. [Mock Data & Canvas Assets](#4-mock-data--canvas-assets)
5. [API Endpoints Reference](#5-api-endpoints-reference)
6. [Data Flow & Compositor Workflow](#6-data-flow--compositor-workflow)
7. [Workflow: How the Tile Visualizer Works](#7-workflow-how-the-tile-visualizer-works)
8. [Branching Strategy, Issues & PR Process](#8-branching-strategy-issues--pr-process)
9. [Testing & Verification](#9-testing--verification)
10. [Future Roadmap](#10-future-roadmap)

---

## 1. Development Setup

### Prerequisites

| Requirement | Version | Why |
| ----------- | ------- | --- |
| Node.js | **18.11 or newer** | The server dev script uses `node --watch` (introduced in 18.11). |
| npm | **9 or newer** | Required for npm workspaces (the monorepo is workspace-based). |
| Browser | Modern Chrome / Edge / Firefox / Safari | Rendering uses the Canvas 2D API with per-pixel homography warping. |

Check your versions:

```bash
node --version
npm --version
```

> **No database is required for local development.** Layout configs and assets are stored on local disk under `server/storage/` (gitignored). An **optional MongoDB** layer exists since Phase 1: set `MONGODB_URI` in `server/.env` to enable the Mongoose models (`Admin`, `Tile`, `CategoryTemplate`, `Project`) and run `npm run db:seed` to populate it.

### Installation

```bash
git clone https://github.com/Rajal-ui/Tile_Visualizer_Project.git
cd Tile_Visualizer_Project

# Install all workspace dependencies (client, server, shared) from the repo root
npm install
```

Environment files are **per-workspace**. Copy the relevant example to a `.env` in that workspace and fill in real values. Never commit `.env` files.

```bash
# Client workspace
cp client/.env.example client/.env

# Server workspace
cp server/.env.example server/.env
```

The root `.env.example` exists only as a pointer to the per-workspace files.

### Database & Asset Setup

Layout persistence is handled by the `LayoutStorage` service (`server/src/services/layout-storage.js`), which writes to `server/storage/` on local disk:

- One folder per room: `server/storage/<roomId>/`
- `config.json` — the canonical room config (background/foreground/zones/status)
- `assets/background.png` + `assets/foreground.png` — the room's 2-layer photo pair
- `assets/masks/<zoneId>.png` — generated (derived) mask artifacts

The folder is gitignored, so a fresh clone starts with an empty storage root. The **static seed** for photo layouts lives in `client/src/features/rooms/data/layouts.js` and is used as a fallback whenever the API is unavailable. `useLayout()` (`client/src/features/rooms/hooks/useLayout.js`) prefers the backend-served config and falls back to the seed.

To render the seeded `kitchen-iridium` layout from backend storage: open the app → **Editor** → draw the Floor/Wall/Counter polygons → **Save Draft** or **Publish**. This uploads the seed assets into `server/storage/`.

### Start Development

From the repository root:

```bash
# Client + server together (concurrently, with hot reload)
npm run dev

# Or run them individually
npm run dev:client   # Vite dev server -> http://localhost:5173
npm run dev:server   # Express API -> http://localhost:4000
```

| Service | URL | Notes |
| ------- | --- | ----- |
| Client | http://localhost:5173 | Vite dev server with `/api` proxied to port 4000 (`client/vite.config.js`) |
| Server | http://localhost:4000 | Express API; `GET /health` and `GET /api/layouts/*` |

The demo admin login is seeded into MongoDB by `npm run db:seed` (defaults in `server/.env.example`: `admin` / `admin123`). Credentials are verified against the API — nothing is hardcoded in the client bundle.

### Environment Variables

| Variable | Workspace | Required | Default | Notes |
| -------- | --------- | -------- | ------- | ----- |
| `VITE_API_URL` | client | No | *(empty — Vite proxy)* | Base URL of the backend API (`client/src/services/api-base.js`). Empty in dev uses the `/api` proxy; set it when the API is served from another origin. |
| `PORT` | server | No | `4000` | HTTP port for the Express API. |
| `NODE_ENV` | server | No | `development` | Runtime environment. |
| `STORAGE_ROOT` | server | No | `storage` | Directory root for layout configs + assets on disk (see `server/src/config/env.js`). |
| `MONGODB_URI` | server | No | *(none)* | MongoDB connection string. Unset → disk storage only (with a warning); set → enables the Mongoose layer + `npm run db:seed`. |

> **Planned (not yet implemented):** future backend modules will add variables such as `JWT_SECRET`, `DATABASE_URL`, and `STORAGE_BUCKET_URL` once admin auth, a real DB, and cloud storage land. Do not add `.env` entries today unless the code reads them.

### Build & Preview

```bash
npm run build      # production build of the client -> client/dist/
npm run preview    # serve the production build locally
npm run start      # run the compiled server entry point
```

---

## 2. Architecture Overview

The project is an **npm-workspaces monorepo** with three co-located packages plus documentation, scripts, and tests.

```
                         +------------------------------------------------------+
                         |                      CLIENT (SPA)                    |
                         |  React 18 + Vite 6 + Tailwind CSS 3                 |
                         |                                                      |
                         |  UI Layer                 Compositor Engine          |
                         |  +-----------------+     +----------------------+   |
                         |  | Dashboard       |     | Photo layouts:       |   |
                         |  | RoomSelector    |     |  canvas-compositor   |   |
                         |  | TileCatalogue   |     |  +- homography.js    |   |
                         |  | TileSwapPanel   |     |  +- polygon.js       |   |
                         |  | LayoutEditor    |     |  +- textures.js      |   |
                         |  | Visualizer      |     | CSS rooms:           |   |
                         |  |  +- RoomCanvas  |     |  +- PhotoViewer      |   |
                         |  |  +- PhotoViewer |     |     (3-layer CSS)    |   |
                         |  +-----------------+     +----------------------+   |
                         |         |                         |                 |
                         |   auth.context          workspace.context (store)   |
                         +---------+-----------------------+-------------------+
                                   |   HTTP /api (Vite proxy)
                                   v
                         +--------------------------+      shared/schemas/layout.js
                         |         SERVER (API)     |<--   validateLayout / createRoom
                         |  Express 4               |      (imported by both sides)
                         |  routes/health.js        |
                         |  routes/layouts.js       |
                         |  services/layout-storage |
                         |  config/env.js           |
                         +------------+-------------+
                                      | multer + sharp
                                      v
                         +--------------------------+
                         |   LOCAL DISK STORAGE     |
                         |   server/storage/<room>/ |
                         |   config.json + assets/  |
                         |   (S3-ready interface)   |
                         +--------------------------+
                            (no DB today, no CDN today)
```

### Key Design Decisions

1. **Monorepo architecture.** `client/`, `server/`, and `shared/` are npm workspaces (`package.json` → `workspaces`). Shared, framework-agnostic code (schemas, types, constants) lives in `shared/` and is imported by both sides via the `@shared/*` alias (configured in `client/vite.config.js` and `client/jsconfig.json`).

2. **Two rendering paths.** The visualizer supports two compositing strategies:
   - **CSS photo rooms (3-layer CSS perspective)** — `bg.jpg` → a CSS-3D-transformed tile layer → `fg.png`. Used by Living Room, Bedroom, Bathroom, Staircase, and Exterior. See `Visualizer.jsx` → `PhotoViewer`.
   - **2-layer Canvas layouts (photo-based)** — background → per-plane homography-warped, polygon-masked tile → foreground. Used by the Kitchen IRIDIUM photo layout. See `RoomCanvas.jsx` → `canvas-compositor.js`. This is a **Canvas 2D** pipeline with per-pixel reverse homography mapping — not WebGL (a WebGL shader backend is a possible future optimization, but the source of truth today is `canvas-compositor.js`).

3. **Polygons are the source of truth for masking.** A plane's `polygon` (`[[x,y] xN]`) is rasterized into a feathered alpha mask at render time (`polygon.js`). `maskSrc` PNGs were removed from the config; the backend stores generated mask PNGs under `assets/masks/` as *derived artifacts only*.

4. **Occlusion is owned by the foreground layer.** There is no live segmentation or furniture-exclusion logic. `foreground.png` (furniture/objects only, transparent elsewhere) is always drawn on top, unconditionally.

5. **Local disk storage behind an S3-ready interface.** `LayoutStorage` abstracts persistence; swapping the disk backend for cloud object storage should not touch routes or the client. An optional MongoDB layer exists since Phase 1 (models + seed, see `server/src/config/db.js`), but no CRUD API uses it yet. No cloud/CDN is configured.

6. **Client-side canvas composition today; server-side pre-rendering is a future option.** Rendering happens in the browser. A server-side room pre-render could be added later for PDF/image export (see [section 10](#10-future-roadmap)).

### Directory Structure

```text
tile-visualizer/
+-- .github/                            # GitHub review configuration
|   +-- CODEOWNERS                      # default + per-path reviewers
|   +-- pull_request_template.md        # PR checklist (issue link, screenshots, tests)
|   +-- workflows/ci.yml                # PR category CI + quality gate
|   +-- ISSUE_TEMPLATE/
|       +-- bug_report.md               # bug report template
|       +-- feature_request.md          # feature request template
+-- client/                             # Frontend application (React + Vite + Tailwind)
|   +-- public/
|   |   +-- assets/
|   |   |   +-- rooms/<id>/             # bg.jpg + fg.png per CSS room
|   |   |   |   +-- kitchen/            # background.png + foreground.png (photo layout)
|   |   |   |   +-- living-room/ bedroom/ bathroom/ staircase/ facade/
|   |   |   +-- tile-textures/IRIDIUM/  # 6 tile texture PNGs (Iridium series)
|   |   +-- favicon.svg
|   +-- src/
|   |   +-- app/                        # App shell + providers (App.jsx, providers.jsx)
|   |   +-- features/                   # feature-based organization
|   |   |   +-- auth/                   # Login page, auth.context, forgot/reset pages
|   |   |   +-- dashboard/              # Dashboard page (shell of the app)
|   |   |   +-- catalogue/              # Tile list/card/modal, tile + pattern data
|   |   |   +-- visualizer/             # RoomCanvas, PhotoViewer, compositor libs
|   |   |   +-- rooms/                  # RoomSelector, rooms + layouts data, useLayout
|   |   |   +-- layouts/                # LayoutEditor + geometry helpers
|   |   +-- lib/  services/  store/  styles/
|   |   +-- lib/textures.js             # procedural SVG texture generator
|   |   +-- services/layouts.api.js     # fetch wrapper for /api/layouts
|   |   +-- store/workspace.context.jsx # global workspace state (localStorage)
|   |   +-- main.jsx                    # entry point
|   +-- .env.example  index.html  jsconfig.json
|   +-- package.json  tailwind.config.js  vite.config.js
+-- server/                             # Backend API (Express 4)
|   +-- src/
|   |   +-- config/env.js               # PORT / NODE_ENV / STORAGE_ROOT / MONGODB_URI
|   |   +-- config/db.js                # optional MongoDB connection
|   |   +-- routes/health.js            # GET /health
|   |   +-- routes/layouts.js           # GET/POST /api/layouts(/::roomId), asset serving
|   |   +-- services/layout-storage.js  # disk persistence + mask rasterization (sharp)
|   |   +-- models/                     # Mongoose models (Admin, Tile, CategoryTemplate, Project)
|   |   +-- scripts/seed.js             # MongoDB seed (admin, room templates, tile catalogue)
|   |   +-- app.js                      # Express wiring + routers
|   |   +-- server.js                   # entry point
|   +-- tests/
|   |   +-- integration.test.js         # HTTP-level API tests (node:test)
|   |   +-- layouts.test.js             # LayoutStorage unit tests
|   |   +-- models.test.js              # Mongoose model registration (no DB needed)
|   |   +-- schemas.test.js             # shared Zod schema checks
|   +-- storage/                        # gitignored runtime layout storage
|   +-- .env.example
|   +-- package.json
+-- shared/                             # Cross-app types, constants, schemas, utilities
|   +-- schemas/layout.js               # canonical Room/Zone/Plane schema + validateLayout
|   +-- schemas/id.schema.js            # MongoDB ObjectId schema
|   +-- schemas/auth.schema.js          # admin + login schemas
|   +-- schemas/tile.schema.js          # tile schema
|   +-- schemas/template.schema.js      # category template schema
|   +-- schemas/project.schema.js       # project schema
|   +-- schemas/index.js                # barrel + validate() helper
|   +-- scripts/smoke.mjs               # shared build smoke test
|   +-- package.json
+-- docs/                               # architecture, setup, structure, API, PRD
+-- scripts/                            # dev / maintenance scripts
+-- tests/                              # cross-app integration tests
+-- .env.example  .gitignore  README.md
+-- package.json                        # npm workspaces + root scripts
+-- package-lock.json
```

> Directories are only tracked when they contain files — no `.gitkeep`
> placeholders for future modules. Create a directory (and its files) when the
> module is actually implemented. **Do not move feature-specific code into
> generic shared folders.**

## 3. Tech Stack

| Category | Technology | Where |
| -------- | ---------- | ----- |
| **Frontend framework** | React 18 (`react`, `react-dom`) | `client/src/` |
| **Build tool** | Vite 6 (`@vitejs/plugin-react`) | `client/vite.config.js` |
| **Styling** | Tailwind CSS 3 + PostCSS + autoprefixer | `client/tailwind.config.js`, `client/src/styles/` |
| **Icons** | lucide-react | catalogue / dashboard components |
| **Rendering engine** | Canvas 2D API (2-layer compositor: homography warp + polygon masks) + CSS 3D transforms (PhotoViewer) | `client/src/features/visualizer/` |
| **Texture generation** | Procedural SVG data-URIs (marble, granite, terrazzo, wood, concrete, slate, solid) | `client/src/lib/textures.js` |
| **Backend framework** | Express 4 | `server/src/` |
| **File uploads** | multer 2 (memory storage, 25 MB limit) | `server/src/routes/layouts.js` |
| **Image processing** | sharp (image metadata + SVG→PNG mask rasterization) | `server/src/services/layout-storage.js` |
| **Env config** | dotenv | `server/src/config/env.js` |
| **Persistence** | Local disk default; optional MongoDB via mongoose | `server/src/services/layout-storage.js`, `server/src/config/db.js` |
| **Validation** | Zod schemas in `shared/schemas/` | `shared/schemas/index.js` |
| **Shared contracts** | Plain-JS canonical schema + `validateLayout` | `shared/schemas/layout.js` |
| **Testing** | Node's built-in `node:test` + `node:assert/strict` (no third-party runner) | `server/tests/` |
| **Dev orchestration** | `concurrently` (root `npm run dev`) | root `package.json` |
| **CI/CD** | GitHub Actions (`.github/workflows/ci.yml`) — PR category checks + quality gate | `.github/workflows/` |

> **JavaScript, not TypeScript.** All packages are plain ESM (`"type": "module"`).
> No `.ts` files, type-check step, or dedicated types folders exist today.

---

## 4. Mock Data & Canvas Assets

All current assets are static files or in-memory generated data — there is no asset upload/CDN flow wired up yet (uploads go through `multer` on the layout routes only).

### Room scenes (photo layouts)

Photo-based rooms use a **2-layer model** defined by a layout config (see `shared/schemas/layout.js`):

| Asset | Location | Role |
| ----- | -------- | ---- |
| `background` | `server/storage/<roomId>/assets/background.png` | Room photo with furniture/objects removed (inpainted clean) — bare floor/wall/counter visible. |
| `foreground` | `server/storage/<roomId>/assets/foreground.png` | Same canvas size, transparent except furniture/objects. Drawn **on top, unconditionally**. |
| Zone masks | `server/storage/<roomId>/assets/masks/<zoneId>.png` | **Derived** artifacts — rasterized from `planes[].polygon` at render time; mask PNGs are a cache, not the source of truth. |
| `config.json` | `server/storage/<roomId>/config.json` | Canonical room config (`id`, `name`, `type`, `background`, `foreground`, `zones`, `status`). |

Client-side static seeds: `client/public/assets/rooms/kitchen/background.png` + `foreground.png` (1728×910). The **Kitchen IRIDIUM** layout ships with `zones: [floor, wall, counter]` but **no polygon data in the static seed** — you must create the polygons in the Layout Editor and publish before tiles will render (see the note in `client/src/features/rooms/data/layouts.js`).

### CSS room scenes

Non-photo rooms (`client/src/features/rooms/data/rooms.jsx`) each need two images in `client/public/assets/rooms/<id>/`:

- `bg.jpg` — full room photo
- `fg.png` — same photo with the floor area cut transparent (PNG with alpha)

The `floor` object in each room entry controls CSS projection: `perspective` (px), `rotateX` (deg), `scaleX`/`scaleY`, `translateY` (px), `originY`, and `tileSize` (texture repeat px). Tuning note in the file: open the app → select the room → tweak until the tile aligns with the photo.

### Tile textures

Two sources feed the catalogue:

1. **Static PNGs** — `client/public/assets/tile-textures/IRIDIUM/*.png` (6 textures: Aruba Armani, Belgium Rossata, Dubbo Beige, Friesland Silk, Kamplay Ivory, Thorn White). Referenced from `tile.texture = { kind: "image", src: "/assets/tile-textures/IRIDIUM/<name>.png" }` in `client/src/features/catalogue/data/tiles.js`.

2. **Procedural SVG textures** — `client/src/lib/textures.js` generates tile textures as `data:image/svg+xml` URIs with a seeded PRNG so rendering is deterministic. Supported `kind`s: `marble`, `granite`, `terrazzo`, `wood`, `concrete`, `slate`, `solid` (default). Each generator applies fractal noise, a vignette, and an optional glossy sheen. Set `t.texture = { kind: "marble", base, veins, glossy }` to use one; `t.kind === "image"` short-circuits to the static PNG path.

### Seeding a new tile model

Tiles are data objects in `client/src/features/catalogue/data/tiles.js`:

```js
{
  id: "tile-<series>-<name>",        // unique, kebab-case
  name: "Iridium <Name>",
  category: "Floor",                  // currently "Floor" only
  material: "Porcelain",              // currently "Porcelain" only
  finish: "Matt" | "Glossy",
  size: "600x600mm",                  // e.g. "300x1200mm" for planks
  format: "600x600",                  // machine-readable size
  pattern: "grid",                    // see pattern-labels.js
  grout: "#c6cbd3",                   // grout line color
  price: 1800,
  rooms: ["kitchen", "living-room"],  // which rooms offer it in quick swap
  colors: ["#b8c4c8", "#8fa4aa"],     // palette for catalogue display
  texture: { kind: "image", src: "/assets/tile-textures/IRIDIUM/<Name>.png" },
}
```

Steps to add a tile:

1. Drop the texture into `client/public/assets/tile-textures/<SERIES>/`.
2. Add an entry to `tiles` (or use a procedural `texture` object if no image exists).
3. Add the tile to `tilesForRoom(roomId)` by including the room id in `tile.rooms`.

### Patterns & dimensions

`client/src/features/catalogue/data/pattern-labels.js` defines the display labels for the supported pattern taxonomy — currently only `grid` is used in tile data, but labels exist for: `grid` (Straight Grid), `brick` (Offset / Brick), `diagonal`, `herringbone`, `hexagon`, `large` (Large Format). **Pattern rendering in the compositor is not implemented yet** — today the compositor fills a plane with a straight repeat (optionally homography-warped); grout lines are baked into the texture itself.

Surface/zone types are constrained by `shared/schemas/layout.js`: `floor`, `wall`, `counter`.

---

## 5. API Endpoints Reference

The server is a minimal Express app. Current routers are mounted in `server/src/app.js`:

```js
app.use("/health", healthRouter);
app.use("/api/layouts", layoutsRouter);
```

### Currently implemented

#### `GET /`

Service banner.

```json
{ "name": "Tile Visualizer API", "status": "ok" }
```

#### `GET /health`

Health check used by monitoring and the root `npm run dev` flow.

```json
{
  "status": "ok",
  "uptime": 12.34,
  "timestamp": "2026-08-09T00:00:00.000Z"
}
```

#### `GET /api/layouts`

List all photo layouts (draft + published). Returns an array of summaries:

```json
[
  {
    "id": "kitchen-iridium",
    "name": "Kitchen IRIDIUM",
    "type": "photo",
    "status": "published",
    "hasBackground": true,
    "hasForeground": true,
    "zoneCount": 3
  }
]
```

#### `GET /api/layouts/:roomId`

Fetch the full room config (background/foreground/zones/status). Body matches the canonical schema in `shared/schemas/layout.js`. Returns `404` if the room doesn't exist.

#### `GET /api/layouts/:roomId/assets/*`

Serve stored assets (e.g. `background.png`, `foreground.png`, `masks/floor.png`). Path traversal is guarded by `LayoutStorage.resolveAssetPath` (rejects `..`, absolute paths, and unsupported depths). Returns `404` for unknown files.

#### `POST /api/layouts/:roomId`

Save a full room config (all zones in one request). Accepts either:

- **JSON body** matching the canonical Room schema, or
- **`multipart/form-data`** with a `config` field (JSON string) plus optional file fields: `background`, `foreground`, and one field per zone id (mask PNG).

`multer` uses memory storage with a **25 MB** per-file limit. On save the server:

1. Persists `background`/`foreground` (re-uploaded or already stored),
2. Rasterizes a mask PNG per zone from `planes[].polygon` via `sharp` when no mask file was uploaded and image dimensions are known (`rasterizeMask`),
3. Validates the config with `validateLayout` and rejects invalid configs with a `400`.

Response: `{ "ok": true, "layout": { ...config } }`.

### Planned (not implemented)

Documented in `docs/api.md`. These routers will be mounted in `server/src/app.js` behind TODO markers in a future phase. **Do not depend on them yet.**

| Module | Endpoints |
| ------ | --------- |
| Admin authentication | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` — user roles: Admin vs Client |
| Tile catalogue management | `GET /api/tiles`, `GET /api/tiles/:id`, `POST /api/tiles`, `PATCH /api/tiles/:id`, `DELETE /api/tiles/:id` (admin) |
| Rooms | `GET /api/rooms`, `GET /api/rooms/:id` |
| Layouts / stencils (general) | `GET /api/layouts`, `GET /api/layouts/:id`, `POST /api/layouts`, `PATCH /api/layouts/:id`, `DELETE /api/layouts/:id` |
| Image upload / storage | `POST /api/uploads` |
| Saved visualizer configs | `GET/POST /api/saved-configs`, `GET/PATCH/DELETE /api/saved-configs/:id` |
| Presentation boards | `GET/POST /api/presentation-boards`, `GET/PATCH/DELETE /api/presentation-boards/:id` |
| Projects (exported room renderings) | `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id` |

> **Deprecated (removed):** the old `/api/admin` router (`segment`, `save-layout`, `layouts`) belonged to the retired single-photo-plus-mask pipeline and was deleted with the `legacy/` archive. The `/api/layouts/*` persistence backend is its replacement.

## 6. Data Flow & Compositor Workflow

### The 2-layer compositor pipeline (`canvas-compositor.js`)

For photo-based layouts, rendering is driven by `RoomCanvas.jsx`, which calls `compositeAllZones()`:

```
1. background.png                     <- bare room photo (furniture removed)
   |
2. per zone / per plane:
   a. resolve material texture        <- appliedTiles[zone.label] ?? appliedTiles[zone.id]
   b. warp tile into plane            <- homography.js: reverse-map quad -> tile space
      (or flat repeat when no 4-point corners)
   c. rasterize feathered mask        <- polygon.js: plane.polygon -> alpha mask (1-3px feather)
   d. clip tile to mask               <- destination-in composite
   e. multiply background shading     <- buildShadingLayer() x lightMultiply (default 0.55)
   |
3. foreground.png                     <- furniture/objects, drawn on top unconditionally
```

Details worth knowing when you touch this code:

- **Plane geometry.** A plane is tileable when its `polygon` has ≥ 3 points. If the plane has a 4-point `corners` quad (or a 4-point polygon), the tile is **perspective-warped** via `warpTextureToQuad`; otherwise it's a **flat repeat** scaled by `plane.materialScale` (default 1).
- **Homography warp** (`homography.js`) solves a 3×3 homography with Gaussian elimination, then samples *in reverse*: for each pixel inside the destination quad's bounding box it maps back to tile space, samples the color, and writes it. Texture repeat is achieved with `%tw`/`%th` modulo, so **texture scale is implicit per quad**.
- **Masking & feathering** (`polygon.js`): `rasterizePolygonMask` fills the polygon white, then applies a CSS `blur()` feather (default 2px, 1–3px recommended) so tiles blend with the photo instead of showing a hard edge.
- **Lighting**: the background's luminance is multiplied back over the tile (`lightMultiply`, default `0.55`), so shadows and reflections in the room photo carry through to the tiled surface.
- **Per-plane rendering options** read from the plane config: `opacity` (default 1), `lightMultiply` (default 0.55), `feather` (default 2), `materialScale` (default 1).
- **Graceful degradation**: a missing background aborts the composite; a missing material texture or failed plane render logs a warning and skips that zone rather than breaking the scene.

### The CSS 3-layer path (`PhotoViewer`)

Used when a room has no photo layout (`room.layout` unset):

```
1. bg.jpg        <- full room photo (object-fit: cover)
2. tile layer    <- CSS perspective: rotateX/scale/translate transform of repeating texture
3. fg.png        <- same photo with floor area cut transparent (occludes furniture)
```

Tuning params live in `client/src/features/rooms/data/rooms.jsx` (`room.floor`).

### State flow

```
Login (useAuth) --> App.jsx --> Dashboard
                                  |-- RoomSelector        (rooms/data)
                                  |-- Visualizer
                                  |     |-- PhotoViewer     (CSS 3-layer rooms)
                                  |     +-- RoomCanvas      (photo layouts)
                                  |           +-- canvas-compositor
                                  |           +-- useLayout -> GET /api/layouts/:roomId
                                  |-- TileSwapPanel        (surfaces from room/layout)
                                  |-- TileCatalogue        (catalogue/data)
                                  +-- LayoutEditor         (admin zone/plane editor)
                                        +-- GET + POST /api/layouts/:roomId
                      all read/write workspace.context (store)
```

There is **no router** — authenticated vs. public rendering is a conditional in `App.jsx` (`user ? <Dashboard/> : <Login/>`). Workspace state (`selected room`, `active surface`, `applied tiles`) is persisted to `localStorage` (`tv_prefs`); the admin session is an httpOnly JWT cookie set by the API, validated against `/api/auth/me` on app load.

---

## 7. Workflow: How the Tile Visualizer Works

### Client view (the sales rep / admin)

1. **Log in.** Sign in with the username + password of an admin seeded into MongoDB (see `npm run db:seed`) via `features/auth/pages/Login.jsx`. The server verifies the credentials (bcrypt) and sets an httpOnly JWT session cookie; the session is re-validated against `/api/auth/me` on app load. Forgot/reset links go through `POST /api/auth/forgot-password` / `reset-password`.
2. **Pick a room.** `RoomSelector` lists the static CSS rooms (Living Room, Bedroom, Kitchen, Bathroom, Staircase, Exterior). Kitchen is the photo-layout room and renders through the 2-layer Canvas compositor; the others render through the CSS `PhotoViewer`.
3. **Choose a surface.** `TileSwapPanel` shows tabs for the room's tileable surfaces — for photo layouts these come from `layout.zones` labels (Floor / Wall / Counter); for CSS rooms the defaults are Floor / Wall / Accent Wall.
4. **Browse the catalogue.** `TileCatalogue` filters by category, finish, material, and free-text search; the detail modal shows specs; **Apply** binds the tile to the active surface.
5. **Visualize.** `RoomCanvas`/`PhotoViewer` re-render instantly on tile change — swapping a tile per surface is a single state update in `workspace.context` (`applyTile`/`removeTile`).
6. **Present.** The **Present** button hides the catalogue/editor chrome for a clean, client-facing view (`Dashboard.jsx`); **Reset** clears applied tiles; **Logout** ends the session.

### Admin view (managing the catalogue & layouts)

1. **Edit a layout.** Dashboard → **Editor** opens `LayoutEditor` for `kitchen-iridium` (the only photo layout today).
2. **Draw zones.** Pick a zone tab (Floor / Wall / Counter) and a **Plane**, then use the Polygon tool: click to place points, click an edge to insert, click the first point to close, right-click to undo. The polygon doubles as the perspective corner points (a 4-point polygon *is* the warp quad). Use **Move** mode to drag handles, **Reference** to overlay the furniture cutout, **Add Plane** for multi-plane zones (e.g. bent walls), and **Undo/Clear** for corrections.
3. **Save Draft or Publish.** Incomplete planes (fewer than 3 points) are dropped on save; publishing validates the config with `validateLayout` and requires at least one completed plane. The config (and, on first save, the seed assets) is POSTed to `/api/layouts/:roomId`. Only **published** layouts appear in the rep-facing room selector.
4. **Manage the catalogue (future).** Tile CRUD, texture upload, and pattern/grout configuration are planned backend modules (see [section 5](#5-api-endpoints-reference)) — today, tiles are static data in `client/src/features/catalogue/data/tiles.js`.

---

## 8. Branching Strategy, Issues & PR Process

### Branching strategy

The main integration branch is **`develop`**. Feature work happens on short-lived branches cut from `develop`. The repository uses issue-scoped and category-prefixed branches — follow the existing convention:

| Prefix | Use for | Example (from repo history) |
| ------ | ------- | --------------------------- |
| `feat/` | New features / enhancements | `feat/tile-catalogue-ui-improvements` |
| `fix/` | Bug fixes | `fix/issue-description` |
| `refactor/` | Structural changes without behavior change | `refactor/enterprise-monorepo-structure` |
| `chore/` | Tooling, config, maintenance | `chore/configure-github-review-workflow` |
| `issue-<n>-…` | Work tracked to a specific issue | `issue-6-rebuild-tile-visualizer-architecture` |

Recommended pattern: `feat/issue-<n>-short-description` or `fix/<short-description>`. Branch from the latest `develop`, keep the branch focused on one logical change, and rebase on `develop` before opening a PR if it has drifted.

### Issues

Please open an issue before starting significant work so it can be triaged and linked to the resulting PR. Two templates are configured in `.github/ISSUE_TEMPLATE/`:

**Bug report** (labels: `bug`, `triage`) — include:

- Description of the bug
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots (especially for rendering issues — a screenshot of the broken composite is worth a lot here)
- Environment: OS, browser version, Node version, branch/commit

**Feature request** (labels: `enhancement`, `triage`) — include:

- Problem statement
- Proposed solution
- Alternatives considered
- Project area (Client / Server / Shared / Docs / Other)

### Commit format — Conventional Commits

This repository uses [Conventional Commits](https://www.conventionalcommits.org/). Keep each commit a single logical unit. Prefix your subject with one of:

- `feat:` — a new feature
- `fix:` — a bug fix
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `docs:` — documentation only
- `test:` — adding or updating tests
- `ci:` — CI / workflow configuration
- `chore:` — maintenance, tooling, config

Example subjects from this repo: `feat: replace canvas compositor with 3-layer CSS tile visualizer (#4)`, `refactor: reorganize into enterprise monorepo structure (#2)`, `chore: configure GitHub review workflow (#3)`, `ci: add PR category workflow with per-category checks and merge gate`.

### Pull request rules

Open a PR against **`develop`** and fill in `.github/pull_request_template.md` completely:

1. **Summary** — what the PR does and why.
2. **Related issue** — `Closes #<issue-number>`. Every PR should be linked to an issue.
3. **Type of change** — feature / bug fix / UI-UX / refactor / docs / config / tests / other.
4. **Project area** — Client / Server / Shared / Docs / Scripts / Tests / GitHub config. This matters: `CODEOWNERS` routes reviewers by path.
5. **Changes made** — bulleted list.
6. **Testing completed** — check each item that applies (app runs locally, production build passes, feature tested manually, responsive layout checked, no console errors, existing functionality verified, automated tests added/updated).
7. **Screenshots or demo** — **required for rendering changes.** The compositor output is highly visual; if you touched `canvas-compositor.js`, `homography.js`, `polygon.js`, `textures.js`, `RoomCanvas.jsx`, or `PhotoViewer`, attach a before/after screenshot or recording.
8. **Reviewer notes** — anything specific the reviewer should inspect.
9. **Checklist** — the contract for a mergeable PR:
   - Code follows the existing project structure (feature-specific logic inside `features/<domain>/`)
   - Shared logic is placed in `shared/` only when genuinely reusable
   - Client and server code are not mixed
   - Imports and file paths work
   - No unnecessary dependencies were added
   - **No secrets, credentials, or `.env` files were committed**
   - Documentation updated if required
   - Tests added/updated where appropriate

### CI & the merge gate

`.github/workflows/ci.yml` classifies every PR by the paths it touches and runs only the relevant checks:

| Category | Triggered by | Checks run |
| -------- | ------------ | ---------- |
| `frontend` | `client/**` | Vite production build (`npm run build`) |
| `backend` | `server/**`, `shared/**` | `node:test` suite (`npm test`) |
| `database` | `shared/schemas/**`, `server/src/models/**`, `server/src/config/db.js` | Zod + layout schema validation (no MongoDB in CI) |
| `chore` | docs, scripts, tests, `.github`, root config | lockfile sync + local doc-link integrity |
| all PRs | — | security scan (committed `.env`, secret patterns) |

A **Quality gate** job fails the run if any category check failed, and should be added as a required status check on `develop` in Settings → Branches. **Nothing merges with a failing or missing required check.** Until a check is required, "CI green" means: server tests pass, production build passes, and the security scan is clean.

**Definition of done:** linked issue ✔ · required checks green ✔ · screenshot for rendering changes ✔ · review checklist satisfied ✔ · merged to `develop`.

---

## 9. Testing & Verification

The test runner is **Node's built-in `node:test`** — no Jest/Vitest dependency. Run the whole suite from the repo root:

```bash
npm test
```

This maps to `npm run test --workspace server` → `node --test tests/*.test.js` (see `server/package.json`).

### Test suites (`server/tests/`)

| File | Scope | Covers |
| ---- | ----- | ------ |
| `layouts.test.js` | `LayoutStorage` unit tests | config create/read/list round-trip; asset write/read; traversal guard (`../evil.png`, deep paths); `rasterizeMask` PNG output (dimensions + 4 channels); invalid room id rejection; `validateLayout` rejection of bad configs. |
| `integration.test.js` | HTTP-level API tests | boots the Express app on an ephemeral port with a temp `STORAGE_ROOT`; `GET /api/layouts` (empty list); `POST` multipart (bg upload → config + rasterized mask persisted + asset served with correct content-type); JSON-only save; `validateLayout` published-empty-zones rejection; `../` traversal guard on the asset route. |

Tests are self-contained: integration tests create a temp directory via `fs.mkdtemp` and set `process.env.STORAGE_ROOT` before importing the app, so they never touch your real `server/storage/`.

### What to verify before opening a PR

There is **no linter or type-check step configured** (no ESLint/Prettier/TS). Verification is manual plus the test suite:

```bash
npm test            # server test suite
npm run build       # production client build must pass
npm run dev         # smoke-test the app locally
```

Then manually check the relevant area (mirroring the PR template's checklist):

- The application runs locally and the seeded admin login works (see `npm run db:seed`)
- The production build passes
- The feature was tested manually in the browser
- Responsive layout looks correct
- **No console errors** (especially for the compositor — `canvas-compositor.js` logs `[composite] skip zone …` debug lines and warns on missing assets by design; anything red is a bug)
- Existing functionality still works (all six rooms render; tile swapping updates instantly)
- Automated tests were added or updated where appropriate — new/changed server behavior should include a test in `server/tests/`

**When to add tests:** if you touch `layout-storage.js`, `routes/layouts.js`, `shared/schemas/layout.js`, or any new backend service, extend the relevant `node:test` file. Client-side logic has no test harness yet — don't add a framework for one-off tests without opening an issue first.

---

## 10. Future Roadmap

Prioritized from `docs/prd.md` and `docs/api.md`. Contributions in these areas should first raise an issue so scope and approach are agreed.

1. **Auth roles & hardening.** Backend auth exists (`/api/auth/login`, `logout`, `me`, register, forgot/reset). Remaining: role guards for all protected routes (Admin vs Client), token rotation/refresh, and rate-limit tuning before production.
2. **Tile catalogue management.** CRUD APIs for the catalogue (`/api/tiles`), category/dimension/format management, and texture upload (`/api/uploads`), replacing static data in `client/src/features/catalogue/data/tiles.js`.
3. **Persistence & cloud storage.** Phase 1 laid the MongoDB foundation (models + seed, see `server/src/models/`), but no CRUD API uses it yet. Build repositories/controllers and the `/api/projects`, `/api/customers` endpoints, or point the S3-ready `LayoutStorage` interface at cloud object storage for layouts and assets.
4. **Pattern & grout rendering.** Implement compositor-level support for the patterns already defined in `pattern-labels.js` (brick, diagonal, herringbone, hexagon) plus configurable grout thickness/color instead of baking grout into textures.
5. **Export & presentation.** PDF/image export of rendered rooms (server-side pre-render), full-screen/kiosk presentation mode for in-store demos, and side-by-side tile comparison.
6. **CI hardening.** Wire up linting (ESLint/Prettier) and client-side tests so the category workflow can run richer checks; add deployments. Note the branch protection rule already in place on `develop`.


