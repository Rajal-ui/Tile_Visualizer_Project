# Architecture

## Current state

**Tile Visualizer** is a client-rendered React SPA. Photo-layout geometry lives
in the backend (an Express API serving `/api/layouts/*` from local disk storage);
tile textures and the CSS-scene rooms remain procedurally/static on the client.

### Client (`client/`)

- **Framework**: React 18 + Vite 6 + Tailwind CSS 3.
- **Entry point**: `client/src/main.jsx` → `app/providers.jsx` → `app/App.jsx`.
- **Auth (backend-backed)**: `features/auth/auth.context.jsx` provides `useAuth()`
  backed by the Express API — `POST /api/auth/login`, `POST /api/auth/logout`,
  `GET /api/auth/me`. Credentials are verified against MongoDB (bcrypt-hashed),
  and the session is an httpOnly JWT cookie. The login page accepts username +
  password; forgot/reset pages call `POST /api/auth/forgot-password` and
  `POST /api/auth/reset-password`. The persisted session is validated against
  `/me` on app load. There are no hardcoded credentials in the client bundle.
- **Workspace state**: `store/workspace.context.jsx` provides `useWorkspace()`
  with the selected room, active surface, applied tiles, and catalogue dark mode,
  persisted to `localStorage` (`tv_prefs`). Photo-based rooms derive their tileable
  surfaces from the layout's zone labels (Floor/Wall/Counter...). Layouts are
  resolved via `useLayout()` (`features/rooms/hooks/useLayout.js`), which fetches
  the backend-served config and falls back to the static seed
  (`features/rooms/data/layouts.js`).
- **Rendering** — two paths:
  1. **CSS photo rooms** (`features/visualizer/pages/Visualizer.jsx` →
     `PhotoViewer`): 3-layer CSS perspective — `bg.jpg`, a CSS-3D-transformed tile
     layer, then `fg.png` on top. Used by the existing SVG-scene rooms (Living
     Room, Bedroom, etc.), untouched by the 2-layer rebuild.
  2. **2-layer canvas layouts** (`features/visualizer/pages/RoomCanvas.jsx` →
     `features/visualizer/lib/canvas-compositor.js`): per-plane homography-warped,
     polygon-masked tile composited on canvas. Used by photo-based layouts (see
     below). Polygon rasterization + feathering lives in
     `features/visualizer/lib/polygon.js`.
  Tile textures are procedurally generated SVG data-URIs (`lib/textures.js`) —
  no static image assets are required today.
- **Layout editor** (`features/layouts/pages/LayoutEditor.jsx`): admin tool that
  defines photo-layout geometry — click-to-place N-point polygons per plane,
  multiple planes per zone, and an optional 4-corner perspective quad per plane.
  It loads the layout config from the backend API (falling back to the static
  seed), and **Save Draft / Publish** POST the canonical shape (see
  `shared/schemas/layout.js`) back through `/api/layouts/:roomId` via
  `services/layouts.api.js`. Geometry helpers live in
  `features/layouts/lib/geometry.js`.

## Photo-based layouts (2-layer model)

Photo-based rooms are defined by a layout config served by the backend
(`/api/layouts/:roomId`, persisted to local disk storage; static seed in
`features/rooms/data/layouts.js`). The canonical schema lives in
`shared/schemas/layout.js`:

- **background** — room photo with furniture/objects removed (inpainted clean);
  bare floor/wall/counter visible only.
- **foreground** — same canvas size, transparent except furniture/objects;
  always drawn on top, unconditionally.
- **zones** — `[{ id, label, planes }]`, where `planes` is an array of
  `{ polygon, corners }`:
  - `polygon` — zone boundary points `[[x,y] xN]` (N >= 3); the compositor
    rasterizes this into a feathered alpha mask at render time (no `maskSrc`
    PNGs in config).
  - `corners` — 4-point perspective quad `[[x,y] x4]` for the homography warp.
    For a simple quad it equals `polygon`; multi-plane zones (bent walls) hold
    one plane per flat segment.
- **status** — `"draft" | "published"`. Only published layouts appear in the
  rep-facing room selector.

Composite order in `canvas-compositor.js`:

```
background.png
  → per plane: warp tile (quad corners) or flat repeat → clip to feathered
    polygon mask → multiply background luminosity back over the tile for real
    shadows/reflections
  → foreground.png (on top, unconditionally)
```

There is **no live segmentation / furniture-exclusion logic** — `foreground.png`
owns occlusion. Tiles are resolved at render time from `useWorkspace().appliedTiles`
keyed by zone label, so swapping a tile per zone is instant.

## Removed legacy code

Deprecated mask-generation/compositor wiring (old SAM/manual mask pipeline, the
old single-photo-plus-mask model, furniture-hole mask assets) was removed in the
cleanup; the `legacy/` archive was deleted. The 2-layer compositor and the
layout persistence backend are the only compositing/masking paths.

### Server (`server/`)

Express app (`app.js` / `server.js`) exposing `GET /`, `GET /health`, and the
`/api/layouts/*` persistence router (list, fetch, save, serve assets) backed by
`services/layout-storage.js` (multer + sharp).

**Phase 1 foundation (MongoDB):** `config/db.js` connects to MongoDB when
`MONGODB_URI` is set (skipped with a warning otherwise, so local disk storage
remains the default). Mongoose models live in `models/` — `Admin`, `Tile`,
`CategoryTemplate`, `Project` — and `scripts/seed.js` seeds an admin, room
category templates, and the tile catalogue (`npm run db:seed`). Future modules
(controllers, middleware, repositories, validators, utils) will be added under
`server/src/` as they are implemented.

### Shared (`shared/`)

Framework-agnostic code that both `client` and `server` can import. It holds
the canonical layout schema (`schemas/layout.js`, plain ESM, no deps) and the
Zod validation schemas + barrel (`schemas/index.js` with `auth`, `tile`,
`template`, `project`, `id`). The client imports via the `@shared/*` alias
(`vite.config.js` / `jsconfig.json`); the server imports the linked workspace
package `@tile-visualizer/shared` directly (npm workspaces symlink).

## Data flow (current phase)

```
Login (useAuth) ──► App.jsx ──► Dashboard
                                  ├─ RoomSelector    (rooms/data)
                                  ├─ Visualizer      (CSS photo rooms)
                                  │     └─ PhotoViewer (bg + CSS tile + fg)
                                  ├─ Visualizer      (photo-based layouts)
                                  │     └─ RoomCanvas → canvas-compositor
                                  │        (background → planes → foreground)
                                  │     └─ useLayout → fetchLayout(/api/layouts/:roomId)
                                  ├─ TileSwapPanel   (surfaces from room/layout)
                                  ├─ TileCatalogue   (catalogue/data)
                                  │     ├─ TileCard
                                  │     └─ TileModal
                                  └─ LayoutEditor    (admin zone/plane editor)
                                        └─ /api/layouts/:roomId (fetch + save)
                          all read/write workspace.context (store)
```

State lives in React context; there is no router (authenticated vs. public
rendering is a conditional in `App.jsx`).

## Future backend modules

Expected from the PRD (`docs/prd.md`): admin authentication, tile catalogue
management, layout/stencil management, image upload and storage, saved
visualizer configurations, presentation boards, and customer/project records.
See `docs/api.md` for the planned endpoints and `docs/setup.md` for wiring the
client to the API.
