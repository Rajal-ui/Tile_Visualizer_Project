# Tile Visualizer
[![Build Status](https://github.com/Rajal-ui/Tile_Visualizer_Project/actions/workflows/ci.yml/badge.svg)](https://github.com/Rajal-ui/Tile_Visualizer_Project/actions/workflows/ci.yml)

Internal tile and granite visualizer for the sales team. Browse the tile catalogue,
pick a room layout, and apply tiles to floors, walls, and accent walls in real time.

## Repository structure

This is an npm-workspaces monorepo:

- `client/` — React 18 + Vite + Tailwind CSS frontend (the app itself)
- `server/` — Express API (`/health`, `/api/layouts/*`, optional MongoDB via mongoose)
- `shared/` — cross-app schemas shared by client and server (`schemas/layout.js`, Zod DTOs)
- `docs/` — architecture, setup, structure, and API documentation
- `scripts/` — development and maintenance scripts
- `tests/` — cross-app integration tests

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

# Run the server test suite (node:test)
npm test

# Seed MongoDB (requires MONGODB_URI in server/.env)
npm run db:seed
```

> **Note on credentials:** admin accounts are stored in MongoDB (seeded via
> `npm run db:seed`, defaults `admin` / `admin123` in `server/.env.example`) and
> verified against the API — no credentials exist in the client bundle.

## Environment variables

Each workspace has its own `.env.example`. Copy one to `.env` in that workspace
and fill in real values. No `.env` files are committed.

- `client/.env.example` — `VITE_API_URL` (optional; leave unset in dev to use the Vite `/api` proxy)
- `server/.env.example` — `PORT`, `NODE_ENV`, `MONGODB_URI` (optional)

## Documentation

See `docs/` for the architecture, setup guide, project structure, and API reference.

## Deployment

| Service | URL | Platform |
|---------|-----|----------|
| Client (Production) | https://tile-visualizer-project-client-e52y.vercel.app | Vercel |
| Client (Preview) | https://tile-visualizer-project-client-e52y-4oyhxy1il.vercel.app | Vercel |
| API | https://tile-visualizer-project.onrender.com | Render |

**Note:** The Vercel preview URL changes per deployment. The production URL is stable.
