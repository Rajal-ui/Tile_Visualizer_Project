import nodemailer from "nodemailer";
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  CLIENT_URL,
  PASSWORD_RESET_TTL_MINUTES,
} from "../config/env.js";

/** Last email sent (or "would have sent") — used by tests and log-mode dev. */
export const lastEmail = { value: null };

function createTransporter() {
  if (!SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

/**
 * Build the reset-email payload. Returns the message object exactly as it would
 * be handed to nodemailer, so callers/tests can assert on subject/body/links.
 *
 * @param {{ to: string, token: string }} opts
 */
export function buildPasswordResetEmail({ to, token }) {
  const resetUrl = `${CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    from: MAIL_FROM || "Tile Visualizer <no-reply@tile-visualizer.local>",
    to,
    subject: "Reset your Tile Visualizer password",
    text: [
      "You requested a password reset for your Tile Visualizer account.",
      "",
      `Open the link below to choose a new password. It expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.`,
      "",
      resetUrl,
      "",
      "If you didn't request this, you can ignore this email.",
    ].join("\n"),
    html:
      `<p>You requested a password reset for your <strong>Tile Visualizer</strong> account.</p>` +
      `<p>Open the link below to choose a new password. It expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.</p>` +
      `<p><a href="${resetUrl}">${resetUrl}</a></p>` +
      `<p>If you didn't request this, you can ignore this email.</p>`,
  };
}

/**
 * Send a password-reset email.
 *
 * When SMTP is configured it is delivered via nodemailer; otherwise (local dev,
 * tests, CI without SMTP) the payload is recorded on `lastEmail` and returned
 * un-sent so the flow stays green and inspectable.
 *
 * @returns {Promise<object>} resolved nodemailer info or the payload in log mode
 */
export async function sendPasswordResetEmail({ to, token }) {
  const payload = buildPasswordResetEmail({ to, token });
  lastEmail.value = payload;

  const transporter = createTransporter();
  if (!transporter) {
    console.log(
      `[email] SMTP not configured — reset email for ${to} logged instead of sent.`
    );
    return { ...payload, preview: true };
  }
  return transporter.sendMail(payload);
}
