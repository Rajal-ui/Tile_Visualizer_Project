import axios from "axios";

/**
 * Name of the window event dispatched whenever any API call is rejected with a
 * 401. Consumers (e.g. AuthContext) listen for it to reset the session state.
 */
export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

const rawBase = import.meta.env.VITE_API_URL || "";

/** Base URL of the backend API. Uses VITE_API_URL when set, otherwise "" (same
 * origin, proxied to the API server by the Vite dev proxy). Never ends with a
 * trailing slash. */
const BASE_URL = rawBase.replace(/\/+$/, "");

/**
 * Monotonic counter identifying the current authentication epoch. Advanced
 * after every successful login so a 401 from a request issued under an older
 * epoch (e.g. an unauthenticated `/me` still in flight when the user signs in)
 * cannot tear down a freshly established session.
 */
let authGeneration = 0;

/** Advance the authentication epoch (call after a successful login). */
export function bumpAuthGeneration() {
  authGeneration += 1;
}

/** Build a normalized API error from an Axios failure. */
function toApiError(error) {
  const status = error.response?.status;
  const detail = error.response?.data;
  const message = detail?.error
    ? detail.error
    : status
      ? error.message
      : "Network error. Is the API server running?";
  const err = new Error(message);
  err.status = status;
  err.detail = detail;
  err.network = !status;
  err.cause = error;
  return err;
}

/** Shared Axios instance for all backend calls. Authentication is cookie-based
 * (httpOnly JWT) and handled by the browser via `withCredentials`. */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  config.authGeneration = authGeneration;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (
      error.response?.status === 401 &&
      error.config?.authGeneration === authGeneration
    ) {
      bumpAuthGeneration();
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
    }
    return Promise.reject(toApiError(error));
  }
);
