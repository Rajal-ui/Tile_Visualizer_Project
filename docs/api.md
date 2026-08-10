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

## Planned endpoints

Expected future modules from the PRD (`docs/prd.md`). These are placeholders for
the backend integration phase — none are implemented yet.

### Admin authentication

| Method | Path              | Purpose                        |
| ------ | ----------------- | ------------------------------ |
| POST   | `/api/auth/login` | Exchange credentials for a token |
| POST   | `/api/auth/logout` | Invalidate the session       |
| GET    | `/api/auth/me`    | Current admin session/user     |

### Tile catalogue management

| Method | Path             | Purpose                     |
| ------ | ---------------- | --------------------------- |
| GET    | `/api/tiles`     | List/search/filter tiles    |
| GET    | `/api/tiles/:id` | Tile detail                 |
| POST   | `/api/tiles`     | Create tile (admin)         |
| PATCH  | `/api/tiles/:id` | Update tile (admin)         |
| DELETE | `/api/tiles/:id` | Remove tile (admin)         |

### Photo layout persistence (2-layer model)

Implemented in Phase 2. A full room config (all zones together) is saved/fetched
as one document. Body shape matches the canonical schema in
`shared/schemas/layout.js`.

| Method | Path                    | Purpose                                        |
| ------ | ----------------------- | ---------------------------------------------- |
| GET    | `/api/layouts`          | List photo layouts (draft + published)         |
| GET    | `/api/layouts/:roomId`  | Fetch full room config (background/foreground/zones/status) |
| POST   | `/api/layouts/:roomId`  | Save full room config (all zones in one request, `status: draft | published`) |
| GET    | `/api/layouts/:roomId/assets/...` | Serve stored background/foreground + generated mask PNGs |

Assets (background.png, foreground.png, generated mask PNGs) are stored in
server/cloud storage at save time — never downloaded to the desktop. The
compositor rasterizes zone masks from `planes[].polygon` at render time; mask
PNGs are derived artifacts only.

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
