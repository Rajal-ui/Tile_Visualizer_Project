import { API_BASE } from "@/services/api-base.js";

const api = (path, { method = "GET", body, json = true } = {}) => {
  const opts = { method, headers: {}, credentials: "include" };
  const token = typeof window !== "undefined" ? localStorage.getItem("tv_token") : null;
  if (token) {
    opts.headers["Authorization"] = `Bearer ${token}`;
  }
  if (body != null) {
    if (body instanceof FormData) {
      opts.body = body;
    } else if (json) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }
  return fetch(`${API_BASE}${path}`, opts)
    .catch((e) => {
      const err = new Error(
        `Cannot reach the API server at ${path}. Is \`npm run dev:server\` running?`
      );
      err.network = true;
      err.cause = e;
      throw err;
    })
    .then(async (r) => {
      const text = await r.text();
      let parsed;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      if (!r.ok) {
        const err = new Error(parsed?.error || r.statusText);
        err.status = r.status;
        err.detail = parsed;
        throw err;
      }
      return parsed;
    });
};

/** List all photo layouts (draft + published). */
export function fetchLayouts() {
  return api("/api/layouts");
}

/**
 * List published photo layouts for a room (summary shape with thumbnail
 * background/foreground URLs). Used by the Rep-facing layout picker.
 */
export function fetchPublishedLayoutsByRoom(roomId) {
  const query = new URLSearchParams({
    roomId: roomId ?? "",
    status: "published",
  });
  return api(`/api/layouts?${query.toString()}`);
}

/** Fetch one layout's full config. */
export function fetchLayout(roomId) {
  return api(`/api/layouts/${encodeURIComponent(roomId)}`);
}

/** PATCH /api/layouts/:roomId — update a layout's status (e.g. publish). */
export function updateLayoutStatus(roomId, status) {
  return api(`/api/layouts/${encodeURIComponent(roomId)}`, { method: "PATCH", body: { status } });
}

/** DELETE /api/layouts/:roomId — permanently remove a layout and its assets. */
export function deleteLayout(roomId) {
  return api(`/api/layouts/${encodeURIComponent(roomId)}`, { method: "DELETE" });
}

/** Publish a draft layout (transitions status to "published"). */
export function publishLayout(roomId) {
  return updateLayoutStatus(roomId, "published");
}

/**
 * Save a layout config. Pass `files` to upload assets (background/foreground/masks)
 * via multipart form-data; otherwise sends JSON.
 *
 * @param {string} roomId
 * @param {object} config  canonical Room config (zones, status, …)
 * @param {Object} [opts]
 * @param {File|Blob} [opts.background]
 * @param {File|Blob} [opts.foreground]
 * @param {Record<string, File|Blob>} [opts.masks]   { floor: File, wall: File, … }
 */
export function saveLayout(roomId, config, opts = {}) {
  if (opts.background || opts.foreground || opts.masks) {
    const form = new FormData();
    form.append("config", JSON.stringify(config));
    if (opts.background) form.append("background", opts.background);
    if (opts.foreground) form.append("foreground", opts.foreground);
    if (opts.masks) {
      for (const [zoneId, file] of Object.entries(opts.masks)) form.append(zoneId, file);
    }
    return api(`/api/layouts/${encodeURIComponent(roomId)}`, { method: "POST", body: form, json: false });
  }
  return api(`/api/layouts/${encodeURIComponent(roomId)}`, { method: "POST", body: config });
}

export function layoutAssetUrl(roomId, assetPath) {
  return `${API_BASE}/api/layouts/${encodeURIComponent(roomId)}/assets/${assetPath.replace(/^\/+/, "")}`;
}
