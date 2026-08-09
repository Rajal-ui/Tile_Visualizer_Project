# Project Structure

## Conventions

- **Feature-based organization** in `client/src/features/<domain>/`. Business
  domains: `auth`, `dashboard`, `catalogue`, `visualizer`, `rooms`, `layouts`.
- Each feature owns its `components/`, `pages/`, `data/`, `hooks/`, `services/`,
  and feature-specific logic. Only genuinely reusable code lives in shared folders.
- `client/src/components/` is reserved for reusable, cross-feature presentational
  components (empty today).
- `client/src/store/` holds global React context state (`workspace.context.jsx`).
- `client/src/lib/` holds framework-agnostic client utilities used by several
  features (e.g. `textures.js`).
- `shared/` is framework-agnostic code safely importable by both `client` and
  `server` via the `@shared/*` alias. Empty scaffold today.
- Path aliases: `@/*` → `client/src/*`, `@shared/*` → `shared/*`
  (configured in `client/vite.config.js` and `client/jsconfig.json`).
- Feature dependencies are directional: pages → components/contexts → data.
  Data files have no imports back into the feature tree.

## Tree

```text
tile-visualizer/
├── client/                     # Frontend application (React + Vite + Tailwind)
│   ├── public/
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   ├── room-layouts/
│   │   │   └── tile-textures/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── app/                # App shell, providers
│   │   ├── components/         # Reusable presentational UI (empty scaffold)
│   │   ├── features/
│   │   │   ├── auth/           # Login page, useAuth context, credentials
│   │   │   ├── dashboard/      # Dashboard page
│   │   │   ├── catalogue/      # Tile list, card, modal, tile data
│   │   │   ├── visualizer/     # SVG visualizer, pattern generators
│   │   │   ├── rooms/          # Room selector, room data/scenes
│   │   │   └── layouts/        # Surface selector, surface definitions
│   │   ├── hooks/              # Reusable React hooks (empty scaffold)
│   │   ├── lib/                # Client utilities (texture generator)
│   │   ├── services/           # API / external service calls (empty scaffold)
│   │   ├── store/              # Global React context (workspace state)
│   │   ├── constants/          # Client constants (empty scaffold)
│   │   ├── types/              # Client types/interfaces (empty scaffold)
│   │   ├── utils/              # Pure helpers (empty scaffold)
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
│   │   ├── config/             # env loading, app config
│   │   ├── controllers/        # request handlers (scaffold)
│   │   ├── middleware/         # auth/error middleware (scaffold)
│   │   ├── routes/             # health route; feature routers to be mounted
│   │   ├── services/           # business logic (scaffold)
│   │   ├── repositories/       # data access (scaffold)
│   │   ├── models/             # data models (scaffold)
│   │   ├── validators/         # request validation (scaffold)
│   │   ├── utils/              # server utilities (scaffold)
│   │   ├── app.js              # Express app wiring
│   │   └── server.js           # Entry point
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── shared/                     # Cross-app types, constants, schemas, utilities
│   ├── constants/
│   ├── schemas/
│   ├── types/
│   ├── utils/
│   └── package.json
├── docs/                       # Architecture, setup, structure, API docs
├── scripts/                    # Dev / maintenance scripts
├── tests/                      # Cross-app integration tests (scaffold)
├── .env.example
├── .gitignore
├── README.md
├── package.json                # npm workspaces + root scripts
└── package-lock.json
```

> Empty directories are tracked with `.gitkeep` as scaffolding and should be
> filled as features are added. Do not move feature-specific code into generic
> shared folders.
