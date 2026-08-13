# Setup Guide

## Prerequisites

- Node.js 18.11 or newer (the server dev script uses `node --watch`)
- npm 9 or newer (npm workspaces)

Check your versions:

```bash
node --version
npm --version
```

## Install

From the repository root:

```bash
npm install
```

This installs the `client`, `server`, and `shared` workspaces and links them.

## Development

```bash
# Client and server together
npm run dev

# Individually
npm run dev:client   # Vite dev server → http://localhost:5173
npm run dev:server   # Express API       → http://localhost:4000
```

The admin account is created by the database seed (`npm run db:seed`), which
uses the `ADMIN_SEED_USERNAME`, `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD`
values from `server/.env` (defaults: `admin`, `admin@example.com`, `admin123`).
Credentials live only in the database — nothing is hardcoded in the client
bundle.

## Build and preview

```bash
npm run build     # production build of the client → client/dist/
npm run preview   # serve the production build
```

## Environment variables

Copy the relevant example and fill in real values (never commit `.env`):

```bash
# Client
cp client/.env.example client/.env

# Server
cp server/.env.example server/.env
```

| Variable        | Workspace | Default           | Purpose                                  |
| --------------- | --------- | ----------------- | ---------------------------------------- |
| `VITE_API_URL`  | client    | *(empty — Vite proxy)* | Base URL of the backend API. Leave unset in dev to use the `/api` proxy; set it when the client and API are served from different origins. |
| `PORT`          | server    | `4000`            | HTTP port for the API                    |
| `NODE_ENV`      | server    | `development`     | Runtime environment                      |
| `MONGODB_URI`   | server    | *(none)*          | MongoDB connection string (optional locally; enables the Phase 1 Mongoose layer) |

If `MONGODB_URI` is unset, the API runs on disk storage (`server/storage/`)
as before. Set it to connect MongoDB and seed the database:

```bash
cd server && npm run seed   # or from the root: npm run db:seed
```

## Tests

Server tests use Node's built-in `node:test` runner (no third-party framework):

```bash
npm test   # runs npm test --workspace server → node --test tests/*.test.js
```

The suites live in `server/tests/`: `layouts.test.js` (LayoutStorage unit
tests), `integration.test.js` (HTTP-level API tests), `models.test.js`
(Mongoose model registration) and `schemas.test.js` (shared Zod schemas). All
run without a live MongoDB. There is no linter or type-check step configured
yet.

## Wiring the client to the API

The client talks to the API through `client/src/services/api-base.js`, which
uses `import.meta.env.VITE_API_URL` as the base when set and otherwise falls
back to the same origin (the Vite dev proxy forwards `/api/*` to the server).
