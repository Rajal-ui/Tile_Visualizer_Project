import { apiClient } from "@/lib/api-client.js";

/** Request a password reset link for the given email (never reveals if it exists). */
export function forgotPassword(email) {
  return apiClient.post("/api/auth/forgot-password", { email });
}

/** Consume a reset token and set a new password. */
export function resetPassword(token, password) {
  return apiClient.post("/api/auth/reset-password", { token, password });
}
