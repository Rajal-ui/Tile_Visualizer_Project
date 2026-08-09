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

### Layout / stencil management

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
