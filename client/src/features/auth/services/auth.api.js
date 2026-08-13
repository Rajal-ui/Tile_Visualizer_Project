import { API_BASE } from "@/services/api-base.js";

const api = (path, { method = "GET", body } = {}) => {
  const opts = { method, headers: {}, credentials: "include" };
  if (body != null) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
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

/** Request a password reset link for the given email (never reveals if it exists). */
export function forgotPassword(email) {
  return api("/api/auth/forgot-password", { method: "POST", body: { email } });
}

/** Consume a reset token and set a new password. */
export function resetPassword(token, password) {
  return api("/api/auth/reset-password", { method: "POST", body: { token, password } });
}
