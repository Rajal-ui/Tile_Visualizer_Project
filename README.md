# Tile Visualizer

Internal tile and granite visualizer for the sales team. Browse the tile catalogue,
pick a room layout, and apply tiles to floors, walls, and accent walls in real time.

## Repository structure

This is an npm-workspaces monorepo:

- `client/` — React 18 + Vite + Tailwind CSS frontend (the app itself)
- `server/` — Express API (scaffolded; `/health` only for now)
- `shared/` — future cross-app types, constants, schemas, and utilities
- `docs/` — architecture, setup, structure, and API documentation
- `scripts/` — development and maintenance scripts
- `tests/` — cross-app integration tests (placeholder)

## Getting started

Requirements: Node.js 18.11+ (for `node --watch`) and npm 9+.

```bash
# Install all workspace dependencies from the repo root
npm install

# Start the client (http://localhost:5173) and server (http://localhost:4000)
npm run dev

# Or run them individually
npm run dev:client
npm run dev:server

# Production build of the client
npm run build

# Preview the production build
npm run preview
```

The demo login is shown on the sign-in screen (`admin` / `admin123`).
Do not rely on these hardcoded credentials in production — see `docs/architecture.md`.

## Environment variables

Each workspace has its own `.env.example`. Copy one to `.env` in that workspace
and fill in real values. No `.env` files are committed.

- `client/.env.example` — `VITE_API_URL` (used once the server is wired up)
- `server/.env.example` — `PORT`, `NODE_ENV`

## Documentation

See `docs/` for the architecture, setup guide, project structure, and API reference.
