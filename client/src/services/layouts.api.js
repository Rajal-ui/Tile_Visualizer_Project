const api = (path, { method = "GET", body, json = true } = {}) => {
  const opts = { method, headers: {} };
  if (body != null) {
    if (body instanceof FormData) {
      opts.body = body;
    } else if (json) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }
  return fetch(path, opts)
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

/** Fetch one layout's full config. */
export function fetchLayout(roomId) {
  return api(`/api/layouts/${encodeURIComponent(roomId)}`);
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
  return `/api/layouts/${encodeURIComponent(roomId)}/assets/${assetPath.replace(/^\/+/, "")}`;
}
