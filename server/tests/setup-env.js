// Preloaded before every node:test file (see server/package.json "test" script).
// Mirrors the CI env so the suite also runs locally: requireAuth.js throws at
// import time when JWT_SECRET is unset, so it must exist before any app import.
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";
