import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PASSWORD_RESET_TTL_MINUTES } from "../config/env.js";

const RESET_TOKEN_BYTES = 32;
const BCRYPT_ROUNDS = 10;

/** SHA-256 hex of a reset token — the value persisted as `resetTokenHash`. */
export function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

/** Generate a single-use reset token + its stored hash + expiry. */
export function generateResetToken(ttlMinutes = PASSWORD_RESET_TTL_MINUTES) {
  const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
  };
}

export const InvalidResetTokenError = class InvalidResetTokenError extends Error {
  constructor(message = "Invalid or expired reset token") {
    super(message);
    this.name = "InvalidResetTokenError";
  }
};

/**
 * Validate a reset token against an admin document (via a store callback).
 *
 * @param {{ token: string }} args
 * @param {(tokenHash: string) => Promise<import("mongoose").Document|null>} findOne
 * @returns {Promise<import("mongoose").Document>} the admin owning the token
 */
export async function findAdminByResetToken({ token }, findOne) {
  const admin = await findOne(hashResetToken(token));
  if (!admin) throw new InvalidResetTokenError();
  const { resetTokenExpiresAt } = admin;
  if (!resetTokenExpiresAt || new Date(resetTokenExpiresAt).getTime() <= Date.now()) {
    throw new InvalidResetTokenError();
  }
  return admin;
}

/**
 * Set a new bcrypt-hashed password and invalidate the reset token.
 *
 * @param {import("mongoose").Document} admin
 * @param {string} newPassword
 */
export async function setAdminPassword(admin, newPassword) {
  admin.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  admin.resetTokenHash = null;
  admin.resetTokenExpiresAt = null;
  await admin.save();
  return admin;
}
