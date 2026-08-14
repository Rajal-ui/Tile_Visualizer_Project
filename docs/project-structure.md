# Project Structure

## Conventions

- **Feature-based organization** in `client/src/features/<domain>/`. Business
  domains: `auth`, `dashboard`, `catalogue`, `visualizer`, `rooms`, `layouts`.
- Each feature owns its `components/`, `pages/`, `data/`, `hooks/`, `services/`,
  and feature-specific logic. Only genuinely reusable code lives in shared folders.
- `client/src/store/` holds global React context state (`workspace.context.jsx`).
- `client/src/lib/` holds framework-agnostic client utilities used by several
  features (e.g. `textures.js`).
- `client/src/services/` holds client-side API wrappers (e.g. `layouts.api.js`).
- `shared/` is framework-agnostic code safely importable by both `client` and
  `server`. The client imports it via the `@shared/*` alias; the server imports
  the linked workspace package `@tile-visualizer/shared` directly.
- Path aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*`
  (configured in `client/vite.config.js` and `client/jsconfig.json`).
- Feature dependencies are directional: pages → components/contexts → data.
  Data files have no imports back into the feature tree.
- Directories are only kept in git when they contain files. Do not add
  `.gitkeep` placeholders for future modules — create the directory (and its
  files) when the module is actually implemented.

## Tree

```text
tile-visualizer/
├── client/                     # Frontend application (React + Vite + Tailwind)
│   ├── public/
│   │   ├── assets/
│   │   │   ├── rooms/<id>/     # CSS rooms: bg.jpg + fg.png; kitchen: background.png + foreground.png
│   │   │   └── tile-textures/  # legacy local IRIDIUM PNGs (migrated to Cloudinary tile-visualizer/tiles)
│   │   └── favicon.svg
│   ├── src/
│   │   ├── app/                # App shell, providers
│   │   ├── features/
│   │   │   ├── auth/           # Login page, useAuth context, password-reset pages
│   │   │   ├── dashboard/      # Dashboard page
│   │   │   ├── catalogue/      # Tile list, card, modal, tile data
│   │   │   ├── visualizer/     # Canvas compositor, homography, room canvas
│   │   │   ├── rooms/          # Room selector, room data, useLayout hook
│   │   │   └── layouts/        # LayoutEditor + geometry helpers
│   │   ├── lib/                # Client utilities (texture generator)
│   │   ├── services/           # API / external service calls (layouts.api.js)
│   │   ├── store/              # Global React context (workspace state)
│   │   ├── styles/             # Tailwind + global CSS
│   │   └── main.jsx            # Entry point
│   ├── .env.example
│   ├── index.html
│   ├── jsconfig.json
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
├── server/                     # Backend application (Express)
│   ├── src/
│   │   ├── config/             # env loading + optional MongoDB connection (db.js)
│   │   ├── routes/             # health + layouts routers
│   │   ├── services/           # business logic (layout-storage)
│   │   ├── models/             # Mongoose models (Admin, Tile, CategoryTemplate, Project)
│   │   ├── scripts/            # seed.js — MongoDB seed (admin, room templates, tile catalogue)
│   │   ├── app.js              # Express app wiring
│   │   └── server.js           # Entry point
│   ├── tests/                  # node:test unit + integration suites
│   ├── .env.example
│   └── package.json
├── shared/                     # Cross-app types, constants, schemas, utilities
│   ├── schemas/layout.js       # Canonical Room/Zone/Plane schema + validateLayout
│   ├── schemas/id.schema.js    # MongoDB ObjectId schema
│   ├── schemas/auth.schema.js  # admin + login schemas
│   ├── schemas/tile.schema.js  # tile schema
│   ├── schemas/template.schema.js  # category template schema
│   ├── schemas/project.schema.js   # project schema
│   ├── schemas/index.js        # barrel + validate() helper
│   ├── scripts/smoke.mjs       # shared build smoke test
│   └── package.json
├── docs/                       # Architecture, setup, structure, API docs
├── scripts/                    # Dev / maintenance scripts
├── tests/                      # Cross-app integration tests
├── .env.example
├── .gitignore
├── README.md
├── package.json                # npm workspaces + root scripts
└── package-lock.json
```

> The `shared/` schema is the single source of truth for layout configs: the
> client imports it via `@shared/schemas/layout.js`, the server via
> `@tile-visualizer/shared/schemas/layout.js` (npm workspace link).
