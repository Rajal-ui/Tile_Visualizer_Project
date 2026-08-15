/**
 * Stateful Playwright route handlers that stand in for the backend API during
 * the E2E sales-demo flow.
 *
 * The suite is fully hermetic:
 *   - every request to a non-local origin is aborted (no Google Fonts,
 *     Cloudinary, or any other live third-party service),
 *   - all `/api/*` calls the demo flow makes are fulfilled from fixtures below.
 *
 * The auth mock keeps an in-memory session flag so the app sees the same
 * unauthenticated -> authenticated transition a real MongoDB-backed server
 * would produce.
 */

export const E2E_ADMIN = {
  username: "admin",
  password: "admin123",
  user: {
    _id: "000000000000000000000001",
    username: "admin",
    name: "Admin",
    email: "admin@example.com",
    role: "superadmin",
  },
};

/** Mirror of the static room seed (display metadata only). */
export const MOCK_ROOMS = [
  { id: "living-room", name: "Living Room", description: "Relaxed & social spaces", isActive: true },
  { id: "bedroom", name: "Bedroom", description: "Calm & restful retreats", isActive: true },
  { id: "kitchen", name: "Kitchen", description: "Functional & fresh workspaces", isActive: true },
  { id: "bathroom", name: "Bathroom", description: "Clean & spa-like details", isActive: true },
  { id: "staircase", name: "Staircase", description: "Statements that ascend", isActive: true },
  { id: "facade", name: "Exterior", description: "Facades & outdoor faces", isActive: true },
];

/**
 * Mirror of the IRIDIUM catalogue. No `tileImage` is sent so the client falls
 * back to its procedural SVG texture generator — no live Cloudinary request.
 */
export const MOCK_TILES = [
  { _id: "tile-iridium-aruba-armani", title: "Iridium Aruba Armani", material: "Porcelain", finish: "Matt", size: "600x600mm", format: "600x600", pattern: "grid", grout: "#c6cbd3", price: 1800, rooms: ["kitchen", "living-room", "bathroom"], compatibleZones: ["floor"], colors: ["#b8c4c8", "#8fa4aa"] },
  { _id: "tile-iridium-belgium-rossata", title: "Iridium Belgium Rossata", material: "Porcelain", finish: "Matt", size: "600x600mm", format: "600x600", pattern: "grid", grout: "#b0a89e", price: 1900, rooms: ["kitchen", "living-room"], compatibleZones: ["floor"], colors: ["#c4b8a8", "#a89888"] },
  { _id: "tile-iridium-dubbo-beige", title: "Iridium Dubbo Beige", material: "Porcelain", finish: "Matt", size: "600x600mm", format: "600x600", pattern: "grid", grout: "#c9bfb0", price: 1750, rooms: ["kitchen", "living-room", "bedroom"], compatibleZones: ["floor"], colors: ["#d4c8b4", "#b8a890"] },
  { _id: "tile-iridium-friesland-silk", title: "Iridium Friesland Silk", material: "Porcelain", finish: "Glossy", size: "600x600mm", format: "600x600", pattern: "grid", grout: "#d0d4d8", price: 2000, rooms: ["kitchen", "bathroom", "living-room"], compatibleZones: ["floor", "wall"], colors: ["#e0e4e8", "#c8ccd0"] },
  { _id: "tile-iridium-kamplay-ivory", title: "Iridium Kamplay Ivory", material: "Porcelain", finish: "Matt", size: "600x600mm", format: "600x600", pattern: "grid", grout: "#d4ccc0", price: 1850, rooms: ["kitchen", "living-room", "bedroom"], compatibleZones: ["floor", "wall"], colors: ["#e8dcc8", "#ccc0a8"] },
  { _id: "tile-iridium-thorn-white", title: "Iridium Thorn White", material: "Porcelain", finish: "Glossy", size: "600x600mm", format: "600x600", pattern: "grid", grout: "#d8dce0", price: 2100, rooms: ["kitchen", "bathroom", "living-room"], compatibleZones: ["floor", "wall", "counter"], colors: ["#f0f2f4", "#d8dce0"] },
];

/** Published-layout summary returned for the Kitchen room's layout picker. */
export const MOCK_LAYOUT_SUMMARY = {
  id: "kitchen-iridium",
  name: "Kitchen IRIDIUM",
  type: "photo",
  roomId: "kitchen",
  status: "published",
  hasBackground: false,
  hasForeground: false,
  zoneCount: 3,
};

/** Full Kitchen IRIDIUM config (zones only — no polygons/assets needed). */
export const MOCK_LAYOUT_CONFIG = {
  id: "kitchen-iridium",
  name: "Kitchen IRIDIUM",
  type: "photo",
  status: "published",
  background: null,
  foreground: null,
  zones: [
    { id: "floor", label: "Floor", planes: [] },
    { id: "wall", label: "Wall", planes: [] },
    { id: "counter", label: "Counter", planes: [] },
  ],
};

/**
 * Register the hermetic route handlers on a page. Call once per test before
 * navigating so the app only ever talks to the in-repo mocks.
 *
 * @param {import("@playwright/test").Page} page
 */
export async function installApiMocks(page) {
  let authenticated = false;

  // Abort anything that isn't the local Vite dev server (fonts, CDNs, …).
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort());

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();

    const json = (status, body, headers = {}) =>
      route.fulfill({ status, headers, contentType: "application/json", body: JSON.stringify(body) });

    try {
      // ---- Auth ----
      if (pathname === "/api/auth/me" && method === "GET") {
        if (!authenticated) return json(401, { error: "Unauthorized" });
        return json(200, { ok: true, user: E2E_ADMIN.user });
      }
      if (pathname === "/api/auth/login" && method === "POST") {
        const body = request.postDataJSON() || {};
        if (body.username === E2E_ADMIN.username && body.password === E2E_ADMIN.password) {
          authenticated = true;
          return json(200, { ok: true, user: E2E_ADMIN.user }, {
            "Set-Cookie": "jwt=e2e-test-session; Path=/; HttpOnly; SameSite=Lax",
          });
        }
        return json(401, { error: "Invalid credentials" });
      }
      if (pathname === "/api/auth/logout" && method === "POST") {
        authenticated = false;
        return json(200, { ok: true });
      }

      // ---- Catalogue / rooms ----
      if (pathname === "/api/v1/rooms" && method === "GET") {
        return json(200, { data: MOCK_ROOMS });
      }
      if (pathname === "/api/v1/categories" && method === "GET") {
        return json(200, { data: [] });
      }
      if (pathname === "/api/v1/tiles" && method === "GET") {
        return json(200, {
          data: MOCK_TILES,
          pagination: { page: 1, limit: 100, totalItems: MOCK_TILES.length, totalPages: 1 },
        });
      }

      // ---- Layouts ----
      if (pathname === "/api/layouts" && method === "GET") {
        const roomId = url.searchParams.get("roomId");
        const status = url.searchParams.get("status");
        if (roomId === "kitchen" && status === "published") {
          return json(200, [MOCK_LAYOUT_SUMMARY]);
        }
        return json(200, []);
      }
      if (pathname === "/api/layouts/kitchen-iridium" && method === "GET") {
        return json(200, MOCK_LAYOUT_CONFIG);
      }

      return route.continue();
    } catch (err) {
      console.error(`[e2e mock] ${method} ${pathname} failed:`, err);
      return json(500, { error: "Mock handler error" });
    }
  });
}