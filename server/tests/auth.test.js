import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";
import bcrypt from "bcryptjs";
import { validate, ForgotPasswordSchema, ResetPasswordSchema } from "@tile-visualizer/shared/schemas/index.js";

const { default: app } = await import("../src/app.js");
const { Admin } = await import("../src/models/index.js");
const { hashResetToken, generateResetToken, findAdminByResetToken, setAdminPassword } = await import(
  "../src/services/password-reset.js"
);
const { buildPasswordResetEmail, sendPasswordResetEmail, lastEmail } = await import(
  "../src/services/email.js"
);
const { rateLimit } = await import("../src/middleware/rate-limit.js");

let server;
let baseUrl;

/** In-memory stand-in for the `admins` collection. */
let store;

function fakeAdmin(overrides = {}) {
  return {
    email: "admin@example.com",
    password: "old-hash",
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    async save() {},
    ...overrides,
  };
}

test.before(() => {
  store = [];
  mock.method(Admin, "findOne", (query) => {
    if (query.email != null) {
      return Promise.resolve(store.find((a) => a.email === query.email) || null);
    }
    if (query.resetTokenHash != null) {
      return Promise.resolve(
        store.find((a) => a.resetTokenHash === query.resetTokenHash) || null
      );
    }
    return Promise.resolve(null);
  });
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  mock.restoreAll();
  server.close();
});

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}

// ---------------------------------------------------------------------------
// Token + service unit tests
// ---------------------------------------------------------------------------

test("generateResetToken produces a hashable, expiring single-use token", () => {
  const { token, tokenHash, expiresAt } = generateResetToken();
  assert.equal(typeof token, "string");
  assert.equal(token.length, 64);
  assert.equal(tokenHash, hashResetToken(token), "tokenHash is the sha256 of the raw token");
  const ttl = new Date(expiresAt).getTime() - Date.now();
  assert.ok(ttl > 50 * 60 * 1000 && ttl <= 60 * 60 * 1000, `ttl in 60-min window (got ${ttl}ms)`);
});

test("findAdminByResetToken rejects missing and expired tokens", async () => {
  await assert.rejects(
    () => findAdminByResetToken({ token: "whatever" }, () => Promise.resolve(null)),
    /Invalid or expired reset token/
  );
  await assert.rejects(
    () =>
      findAdminByResetToken({ token: "whatever" }, () =>
        Promise.resolve(fakeAdmin({ resetTokenExpiresAt: new Date(Date.now() - 1000) }))
      ),
    /Invalid or expired reset token/
  );
});

test("setAdminPassword bcrypt-hashes the new password and clears the token", async () => {
  let saved = null;
  const admin = fakeAdmin({
    resetTokenHash: "abc",
    resetTokenExpiresAt: new Date(Date.now() + 60_000),
    async save() {
      saved = { ...this };
    },
  });
  const updated = await setAdminPassword(admin, "new-password-123");
  assert.notEqual(updated.password, "new-password-123");
  assert.ok(await bcrypt.compare("new-password-123", updated.password), "password is bcrypt hashed");
  assert.equal(updated.resetTokenHash, null);
  assert.equal(updated.resetTokenExpiresAt, null);
  assert.ok(saved, "admin was persisted");
});

test("buildPasswordResetEmail includes the single-use reset link", () => {
  const mail = buildPasswordResetEmail({ to: "a@b.c", token: "tok123" });
  assert.equal(mail.to, "a@b.c");
  assert.match(mail.subject, /reset/i);
  assert.ok(mail.text.includes("/reset-password?token=tok123"));
  assert.ok(mail.html.includes("href=") && mail.html.includes("token=tok123"));
});

test("sendPasswordResetEmail records the payload without SMTP configured", async () => {
  lastEmail.value = null;
  const result = await sendPasswordResetEmail({ to: "a@b.c", token: "tok456" });
  assert.equal(result.preview, true, "no SMTP in CI -> preview mode");
  assert.equal(result.to, "a@b.c");
  assert.ok(result.text.includes("token=tok456"));
  assert.equal(lastEmail.value.to, "a@b.c");
});

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

test("forgot/reset request schemas validate bodies", () => {
  assert.equal(validate(ForgotPasswordSchema, { email: "nope" }).ok, false);
  assert.equal(validate(ForgotPasswordSchema, { email: "a@b.co" }).ok, true);
  assert.equal(validate(ResetPasswordSchema, { token: "t", password: "short" }).ok, false);
  assert.equal(validate(ResetPasswordSchema, { token: "t", password: "long-enough" }).ok, true);
});

// ---------------------------------------------------------------------------
// Route integration tests
// ---------------------------------------------------------------------------

test("POST /api/auth/forgot-password validates email format", async () => {
  const res = await postJson(`${baseUrl}/api/auth/forgot-password`, { email: "not-an-email" });
  assert.equal(res.status, 400);
  assert.ok(res.json.error);
});

test("POST /api/auth/forgot-password never reveals whether the email exists", async () => {
  lastEmail.value = null;
  const res = await postJson(`${baseUrl}/api/auth/forgot-password`, { email: "ghost@example.com" });
  assert.equal(res.status, 200);
  assert.match(res.json.message, /if that email is registered/i);
  assert.equal(lastEmail.value, null, "no email sent for unknown address");
});

test("POST /api/auth/forgot-password stores token + sends email for a known admin", async () => {
  const admin = fakeAdmin({ email: "known@example.com" });
  store.push(admin);
  lastEmail.value = null;

  const res = await postJson(`${baseUrl}/api/auth/forgot-password`, { email: "known@example.com" });
  assert.equal(res.status, 200);
  assert.match(res.json.message, /if that email is registered/i);

  assert.ok(admin.resetTokenHash, "token hash persisted on admin");
  assert.ok(admin.resetTokenExpiresAt, "expiry persisted on admin");

  assert.ok(lastEmail.value, "reset email was produced");
  assert.equal(lastEmail.value.to, "known@example.com");
  const tokenInLink = lastEmail.value.text.match(/token=([a-f0-9]+)/)?.[1];
  assert.ok(tokenInLink, "email body carries the raw token");
  assert.equal(admin.resetTokenHash, hashResetToken(tokenInLink));
});

test("POST /api/auth/reset-password succeeds with a valid unexpired token", async () => {
  const { token, tokenHash } = generateResetToken();
  const admin = fakeAdmin({
    email: "reset@example.com",
    resetTokenHash: tokenHash,
    resetTokenExpiresAt: new Date(Date.now() + 60_000),
  });
  store.push(admin);

  const res = await postJson(`${baseUrl}/api/auth/reset-password`, { token, password: "brand-new-pass" });
  assert.equal(res.status, 200);
  assert.ok(await bcrypt.compare("brand-new-pass", admin.password), "password was updated");
  assert.equal(admin.resetTokenHash, null, "token invalidated after use");
  assert.equal(admin.resetTokenExpiresAt, null);
});

test("POST /api/auth/reset-password rejects an expired token", async () => {
  const { token, tokenHash } = generateResetToken();
  store.push(
    fakeAdmin({
      email: "expired@example.com",
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: new Date(Date.now() - 1000),
    })
  );
  const res = await postJson(`${baseUrl}/api/auth/reset-password`, { token, password: "brand-new-pass" });
  assert.equal(res.status, 400);
  assert.match(res.json.error, /invalid or expired/i);
});

test("POST /api/auth/reset-password rejects a replayed (used) token", async () => {
  const { token, tokenHash } = generateResetToken();
  const admin = fakeAdmin({
    email: "reuse@example.com",
    resetTokenHash: tokenHash,
    resetTokenExpiresAt: new Date(Date.now() + 60_000),
  });
  store.push(admin);

  const first = await postJson(`${baseUrl}/api/auth/reset-password`, { token, password: "first-pass" });
  assert.equal(first.status, 200);

  const second = await postJson(`${baseUrl}/api/auth/reset-password`, { token, password: "second-pass" });
  assert.equal(second.status, 400);
  assert.match(second.json.error, /invalid or expired/i);
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

test("forgot-password rate limiter triggers after max attempts", async () => {
  const limiter = rateLimit({ windowMs: 60_000, max: 2 });
  let nextCalls = 0;
  const req = { ip: "10.0.0.1" };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  const next = () => nextCalls++;

  limiter(req, res, next);
  limiter(req, res, next);
  assert.equal(nextCalls, 2, "first two pass");
  assert.equal(res.statusCode, 200);

  limiter(req, res, next);
  assert.equal(nextCalls, 2, "third is blocked");
  assert.equal(res.statusCode, 429);
  assert.ok(res.body.error);
});
