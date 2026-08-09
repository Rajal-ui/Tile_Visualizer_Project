# Architecture

## Current state

**Tile Visualizer** is a client-rendered React SPA backed by static (procedurally
generated) data. There is no backend API yet; the scaffolded Express server only
exposes `/health`.

### Client (`client/`)

- **Framework**: React 18 + Vite 6 + Tailwind CSS 3.
- **Entry point**: `client/src/main.jsx` → `app/providers.jsx` → `app/App.jsx`.
- **Auth (frontend-only)**: `features/auth/auth.context.jsx` provides `useAuth()`
  with a single hardcoded admin credential (`auth.constants.js`). The session is
  persisted to `localStorage` (`tv_admin_session`).
  > **Warning**: credentials are hardcoded in the client bundle for the current
  > phase. They must move to the backend (admin authentication) before production.
- **Workspace state**: `store/workspace.context.jsx` provides `useWorkspace()`
  with the selected room, active surface, applied tiles, and catalogue dark mode,
  persisted to `localStorage` (`tv_prefs`).
- **Rendering**: the visualizer renders a room's isometric SVG scene and applies
  SVG tile patterns generated on the fly by `features/visualizer/lib/patterns.js`.
  Tile textures are procedurally generated SVG data-URIs (`lib/textures.js`) —
  no static image assets are required today.

### Server (`server/`)

Minimal Express app (`app.js` / `server.js`) with `GET /health`. The directory
scaffold (`controllers`, `services`, `repositories`, `models`, `validators`,
`middleware`, `utils`) is prepared for future modules. Feature routers are
mounted in `app.js` behind TODO markers.

### Shared (`shared/`)

Empty workspace reserved for framework-agnostic types, constants, schemas, and
utilities that both `client` and `server` can import via the `@shared/*` alias.

## Data flow (current phase)

```
Login (useAuth) ──► App.jsx ──► Dashboard
                                  ├─ RoomSelector    (rooms/data)
                                  ├─ LayoutSelector  (layouts/data)
                                  ├─ Visualizer      (room.scene + patterns)
                                  └─ TileCatalogue   (catalogue/data)
                                        ├─ TileCard
                                        └─ TileModal
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
