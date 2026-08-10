# Tile Showroom Visualization System — Backend

Production-grade REST API for the Tile Showroom Visualization System: single-admin
auth, 5 fixed rooms, per-room layouts ("stencils") with floor/wall/ceiling zones,
a searchable tile catalogue, and saved/shared visualizations.

**Stack:** Node.js + Express · MongoDB Atlas (Mongoose) · Redis (cache, sessions,
distributed rate limiting) · Elasticsearch (fast tile search & filters) ·
Cloudinary (image storage) · JWT auth · PDFKit (catalogue export).

---

## 1. Architecture

```
Client (React) ──HTTPS/REST──▶ Express API ──▶ MongoDB Atlas   (source of truth)
                                    │      ──▶ Elasticsearch    (search/filter tiles)
                                    │      ──▶ Redis            (cache + sessions + rate limit)
                                    └──▶ Cloudinary            (images: tiles, layouts, avatars)
```

- **MongoDB** is the source of truth for all data (Admin, Room, Layout, Tile, Visualization).
- **Elasticsearch** holds a denormalized, searchable copy of tiles only — kept in
  sync on every tile create/update/delete. If Elasticsearch is ever down, tile
  search automatically **falls back to a MongoDB text search** so the app keeps working.
- **Redis** caches read-heavy GET responses (rooms, layouts, tile detail, search
  results, dashboard stats), stores the refresh-token allow-list (for logout /
  token revocation), and backs distributed rate limiting — all with graceful
  degradation (Redis being down never breaks a request, it just skips the cache).

## 2. Folder structure

```
src/
  config/         env, db (Mongo), redis, elasticsearch, cloudinary
  models/         Admin, Room, Layout, Tile, Visualization (Mongoose schemas)
  services/       cache.service, elasticsearch.service, pdf.service
  middleware/     auth, error, rateLimiter, validate, upload (multer+Cloudinary)
  validators/     express-validator chains per resource
  controllers/    business logic per resource
  routes/         route wiring per resource + index
  app.js          Express app (middleware stack, routes, error handling)
  server.js       bootstrap: connect Mongo/Redis/ES, start HTTP server, graceful shutdown
scripts/
  createAdmin.js          creates the single admin account from .env
  seed.js                 seeds the 5 fixed rooms
  reindexElasticsearch.js rebuilds the ES index from MongoDB
```

## 3. Data model (matches the product flow)

| Model | Purpose |
|---|---|
| `Admin` | The single login. Hashed password, JWT issuance, account lockout after 5 failed attempts. |
| `Room` | Fixed enum: Living Room, Kitchen, Bedroom, Balcony, Bathroom. |
| `Layout` | A "stencil" belonging to a Room (e.g. Kitchen → Layout 1..5). Holds `previewImage`, `baseImage`, and a `zones[]` array — each zone is a `floor` / `wall` / `ceiling` surface with an optional mask image or perspective polygon (`points`) the frontend uses to warp a tile texture onto that surface. |
| `Tile` | The catalogue item: title, image, texture, category, material, finish, size, thickness, application (`floor`/`wall`/`ceiling`), price, etc. Indexed into Elasticsearch. |
| `Visualization` | A saved combination of `{ room, layout, appliedTiles: { floor, wall, ceiling } }` — what the admin sees after "Apply Tile" + "View Details". Has a public `shareId` for share links, and backs the catalogue/PDF download flow. |

This directly maps to your flow: **Select Room → Choose Layout → Browse/Filter
Tiles (Elasticsearch) → Apply Tile to floor/wall/ceiling → View Details →
Save/Share/PDF**.

## 4. Getting started

### Option A — Docker Compose (recommended, spins up Mongo+Redis+Elasticsearch+API)

```bash
cp .env.example .env
# edit .env: set MONGO_URI (or use mongodb://mongo:27017/tile_showroom for the
# bundled Mongo container), Cloudinary keys, JWT secrets, INITIAL_ADMIN_*

docker compose up -d --build
docker compose exec api npm run create-admin
docker compose exec api npm run seed
```

API is now live at `http://localhost:5000/api/v1`.

### Option B — Local Node (bring your own Mongo/Redis/ES, e.g. MongoDB Atlas + a local Redis/ES via Docker)

```bash
npm install
cp .env.example .env   # fill in real values

# start Redis + Elasticsearch only, if you don't have them:
docker run -d -p 6379:6379 redis:7-alpine
docker run -d -p 9200:9200 -e discovery.type=single-node -e xpack.security.enabled=false \
  docker.elastic.co/elasticsearch/elasticsearch:8.15.0

npm run create-admin   # creates the one admin login
npm run seed           # seeds the 5 rooms
npm run dev            # nodemon, http://localhost:5000
```

### Populating layouts & tiles

Rooms are seeded automatically. Layouts and tiles require image uploads, so
create them via authenticated API calls (Postman, or your admin frontend) —
see endpoints below. Each `Tile` create/update automatically syncs to
Elasticsearch; run `npm run reindex` any time you need to rebuild the ES
index from MongoDB from scratch (e.g. after a bulk data import).

## 5. Authentication

Single-admin login only (no public signup route exists). JWT access token
(15 min) + refresh token (7 days, rotated on every refresh, revocable via
Redis allow-list — so "logout" and "logout everywhere" actually work).
Tokens are returned in the JSON body **and** set as `httpOnly` cookies, so
either a mobile app (bearer token) or a browser (cookies) client works.

```
POST   /api/v1/auth/login              { email, password }
POST   /api/v1/auth/refresh-token      { refreshToken? }        (or via cookie)
POST   /api/v1/auth/logout             { refreshToken? }
POST   /api/v1/auth/logout-all         (auth required)
GET    /api/v1/auth/me                 (auth required)
PUT    /api/v1/auth/change-password    { currentPassword, newPassword } (auth required)
```

Send `Authorization: Bearer <accessToken>` on protected routes.

## 6. API reference

All routes are prefixed with `/api/v1`. Routes under "admin" require a valid
access token; GET routes for rooms/layouts/tiles/health are public so the
showroom-facing screens can read data even before/without a session (adjust
`requireAuth` placement in the route files if you want everything gated).

### Rooms
```
GET    /rooms                    list the 5 rooms (Redis cached)
GET    /rooms/:id
POST   /rooms                    (admin) multipart: coverImage + { name, description, displayOrder }
PUT    /rooms/:id                (admin)
DELETE /rooms/:id                (admin) blocked if layouts still reference it
```

### Layouts (stencils)
```
GET    /layouts?room=<roomId>    list layouts, optionally filtered by room
GET    /layouts/:id
POST   /layouts                  (admin) multipart: previewImage, baseImage +
                                  { name, room, zones: JSON string of
                                  [{ surface: "floor"|"wall"|"ceiling", label, points? }] }
PUT    /layouts/:id              (admin)
DELETE /layouts/:id              (admin) blocked if used in saved visualizations
```

### Tiles (catalogue)
```
GET  /tiles/search?q=&material=&finish=&category=&application=&color=&minPrice=&maxPrice=&sort=&page=&limit=
                                  Elasticsearch-backed search + facet counts (materials,
                                  finishes, categories, applications, colors, price range).
                                  Falls back to MongoDB if ES is unreachable.
GET  /tiles/autocomplete?q=      fast title suggestions as the admin types
GET  /tiles/catalogue/pdf        streams a branded PDF catalogue (optional ?category=&material=)
GET  /tiles/:id
POST /tiles                      (admin) multipart: image, textureImage? +
                                  { title, category, material, finish, application,
                                    length, width, thickness, color, price, ... }
PUT  /tiles/:id                  (admin)
DELETE /tiles/:id                (admin) blocked if used in saved visualizations
```

### Visualizations (apply tile → layout, save/share)
```
POST   /visualizations           (admin) { room, layout, appliedTiles: { floor, wall, ceiling }, title, notes }
GET    /visualizations           (admin) list own saved visualizations, paginated
GET    /visualizations/:id       (admin)
GET    /visualizations/share/:shareId   public — for share links, Redis cached
DELETE /visualizations/:id       (admin)
```

### Admin
```
GET /admin/dashboard             totals (rooms/layouts/tiles/visualizations) + tiles-by-material
GET /admin/system-health         live Mongo/Redis/Elasticsearch connectivity check
PUT /admin/profile                multipart: avatar? + { name }
```

## 7. Security features

- bcrypt (cost 12) password hashing, never returned in responses.
- Access + refresh JWTs; refresh tokens are rotated and revocable via a
  Redis allow-list (real logout, not just "delete the cookie").
- Account lockout after 5 failed logins (15 min).
- `helmet`, `cors` (locked to `CLIENT_URL`), `hpp`, `express-mongo-sanitize`
  against NoSQL injection.
- Redis-backed rate limiting: global API limiter + a much stricter
  per-IP+email limiter on `/auth/login`, plus a search-specific limiter to
  protect Elasticsearch from abuse.
- Centralized error handler normalizes Mongoose/Multer/JWT errors into
  consistent JSON responses and never leaks stack traces in production.
- Structured logging via Winston (daily-rotating file logs + console in dev).

## 8. Caching strategy (Redis)

| Data | Key pattern | TTL | Invalidated on |
|---|---|---|---|
| Room list/detail | `rooms:*` | 30 min | any room create/update/delete |
| Layout list/detail | `layouts:*` | 30 min | any layout create/update/delete |
| Tile detail | `tiles:detail:<id>` | 30 min | that tile's update/delete |
| Tile search results | `tiles:search:<hash>` | 2 min | any tile create/update/delete |
| Autocomplete | `tiles:autocomplete:<q>` | 5 min | any tile create/update/delete |
| Admin dashboard stats | `admin:dashboard:stats` | 2 min | time-based only |
| Shared visualization | `viz:share:<shareId>` | 10 min | that visualization's delete |
| Admin session profile | `admin:profile:<id>` | 5 min | login/logout/password change/profile update |

All cache reads use a `remember(key, ttl, fn)` pattern with automatic
fallback to the source of truth, and every write path does targeted
`delByPattern` invalidation — so the cache can never be stale for more than
its TTL, and normally clears immediately on writes.

## 9. Deployment notes

- **Render / Railway / Fly.io** for the API (`Dockerfile` included), **MongoDB
  Atlas** for the database, managed Redis (Upstash/Redis Cloud) and managed
  Elasticsearch (Elastic Cloud/Bonsai) in production — swap the URLs/creds
  in `.env`, no code changes needed.
- Put the API behind a load balancer/CDN for TLS termination; `app.set('trust
  proxy', 1)` is already set so `req.ip` and rate limiting work correctly
  behind one.
- Run `npm run create-admin` once per environment to provision the single
  admin login; rotate `INITIAL_ADMIN_PASSWORD` immediately after first login
  via `PUT /auth/change-password`.
