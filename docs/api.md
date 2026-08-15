# API Reference

## Current endpoints

### `GET /`

Service banner.

```json
{ "name": "Tile Visualizer API", "status": "ok" }
```

### `GET /health`

Health check used by monitoring and the root `npm run dev` flow.

```json
{
  "status": "ok",
  "uptime": 12.34,
  "timestamp": "2026-08-09T00:00:00.000Z"
}
```

## API versioning

Routes are versioned under `/api/v1/`. The tile catalogue module was the first
to adopt the versioned prefix; new modules should follow `/api/v1/<resource>`.
The auth router remains mounted at `/api/auth` (pre-versioning) and will migrate
to `/api/v1/auth` in a follow-up to avoid breaking existing consumers.

### Tile catalogue management

Routers are mounted in `server/src/app.js` (`/api/v1/tiles`).

| Method | Path                    | Purpose                                        | Access     |
| ------ | ----------------------- | ---------------------------------------------- | ---------- |
| GET    | `/api/v1/tiles`         | List tiles with filters + pagination           | Public     |
| GET    | `/api/v1/tiles/search`  | Full-text search (`q`) over title/material/finish/size | Public |
| GET    | `/api/v1/tiles/:id`     | Tile detail                                    | Public     |
| POST   | `/api/v1/tiles`         | Create tile                                    | Admin      |
| PATCH  | `/api/v1/tiles/:id`     | Update tile (partial)                          | Admin      |
| DELETE | `/api/v1/tiles/:id`     | Remove tile (returns 204)                      | Admin      |

**List & search query params**

| Param      | Type   | Notes                                            |
| ---------- | ------ | ------------------------------------------------ |
| `category` | string | MongoDB ObjectId of the `CategoryTemplate` ref   |
| `room`     | string | Matches a value in the tile's `rooms` array      |
| `size`     | string | Exact match on `size`                            |
| `material` | string | Exact match on `material`                        |
| `finish`   | string | Exact match on `finish`                          |
| `q`        | string | Search term (`search` only). Required unless `zone`/`category` is given |
| `zone`     | string | Filter by tile `compatibleZones` — `floor`, `wall`, or `counter` (`search` only). `compatibleZone` is accepted as an alias |
| `page`     | number | 1-based page (default `1`)                       |
| `limit`    | number | Items per page (default `20`, max `100`)         |

**List / search response shape**

```json
{
  "data": [ { "title": "Iridium Aruba Armani", "category": "…", "material": "Porcelain", "finish": "Matt", "size": "600x600mm", "rooms": ["kitchen", "living-room", "bathroom"], "price": 1800 } ],
  "pagination": { "page": 1, "limit": 20, "totalPages": 1, "totalItems": 4 }
}
```

**Create / update body** is validated against `shared/schemas/tile.schema.js`.
A missing `title`/`category`, a malformed `category`, or an unknown category
reference returns `400` with `{ "error": "…" }`.

## Planned endpoints

Expected future modules from the PRD (`docs/prd.md`). These are placeholders for
the backend integration phase — none are implemented yet.

### Admin authentication

| Method | Path              | Purpose                        |
| ------ | ----------------- | ------------------------------ |
| POST   | `/api/auth/login` | Exchange credentials for a token |
| POST   | `/api/auth/logout` | Invalidate the session       |
| GET    | `/api/auth/me`    | Current admin session/user     |

### Photo layout persistence (2-layer model)

A full room config (all zones together) is saved/fetched as one document.
Body shape matches the canonical schema in `shared/schemas/layout.js`.

| Method | Path                    | Purpose                                        |
| ------ | ----------------------- | ---------------------------------------------- |
| GET    | `/api/layouts`          | List photo layouts; optional `roomId` + `status` query filters |
| GET    | `/api/layouts/:roomId`  | Fetch full room config (background/foreground/zones/status) |
| POST   | `/api/layouts/:roomId`  | Save full room config (all zones in one request, `status: draft | published`) |
| GET    | `/api/layouts/:roomId/assets/...` | Serve stored background/foreground + generated mask PNGs |

Assets (background.png, foreground.png, generated mask PNGs) are stored in
server/cloud storage at save time — never downloaded to the desktop. The
compositor rasterizes zone masks from `planes[].polygon` at render time; mask
PNGs are derived artifacts only.

**List query params**

| Param    | Type   | Notes                                        |
| -------- | ------ | -------------------------------------------- |
| `roomId` | string | Filter to layouts whose `roomId` matches     |
| `status` | string | Filter to `draft` or `published` layouts     |

The list response is an array of summaries: `{ id, name, type, roomId, status,
background, foreground, hasBackground, hasForeground, zoneCount }`. `background`
/`foreground` carry the asset URLs used as gallery thumbnails.

### Layout / stencil management (general, later)

| Method | Path               | Purpose                      |
| ------ | ------------------ | ---------------------------- |
| GET    | `/api/layouts`     | List layouts/stencils        |
| GET    | `/api/layouts/:id` | Layout detail (incl. scene)  |
| POST   | `/api/layouts`     | Create layout (admin)        |
| PATCH  | `/api/layouts/:id` | Update layout (admin)        |
| DELETE | `/api/layouts/:id` | Remove layout (admin)        |

### Rooms

| Method | Path          | Purpose                  |
| ------ | ------------- | ------------------------ |
| GET    | `/api/rooms`  | List rooms               |
| GET    | `/api/rooms/:id` | Room detail           |

### Image upload / storage

| Method | Path                | Purpose                       |
| ------ | ------------------- | ----------------------------- |
| POST   | `/api/uploads`      | Upload tile texture/image     |

### Saved configurations, presentation boards, customer/project records

- `GET/POST /api/saved-configs`, `GET/PATCH/DELETE /api/saved-configs/:id`
- `GET/POST /api/presentation-boards`, `GET/PATCH/DELETE /api/presentation-boards/:id`
- `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id`
- `GET/POST /api/customers`, `GET/PATCH/DELETE /api/customers/:id`

Routers for these will be mounted in `server/src/app.js` behind TODO markers.

## Archived admin endpoints (removed)

The old `/api/admin` router (`POST /api/admin/segment`, `POST /api/admin/save-layout`,
`GET /api/admin/layouts`) belonged to the deprecated single-photo-plus-mask
pipeline and was removed with the `legacy/` archive. The 2-layer layout
persistence backend (`/api/layouts/*`, see "Layouts" above) is its replacement.
