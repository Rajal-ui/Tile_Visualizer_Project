import axios from "axios";

/** localStorage key holding the JWT (used when the backend returns a token). */
export const AUTH_TOKEN_KEY = "tv_auth_token";

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

export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Persist the JWT; passing a falsy value clears it. */
export function setAuthToken(token) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) – bearer auth is skipped */
  }
}

export function clearAuthToken() {
  setAuthToken(null);
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

/** Shared Axios instance for all backend calls. */
export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthToken();
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
    }
    return Promise.reject(toApiError(error));
  }
);
