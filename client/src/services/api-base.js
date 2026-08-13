const rawBase = import.meta.env.VITE_API_URL || "";

/** Base URL of the backend API. Uses VITE_API_URL when set, otherwise "" (same
 * origin via the Vite dev proxy). Never ends with a trailing slash. */
export const API_BASE = rawBase.replace(/\/+$/, "");