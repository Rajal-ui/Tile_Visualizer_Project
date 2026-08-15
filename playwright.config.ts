import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config (cross-app integration suite — see CONTRIBUTING.md
 * "Testing & Verification").
 *
 * The sales-demo flow is exercised against the Vite dev server with the backend
 * API replaced by in-repo mock handlers (tests/e2e/mocks/api.js). That keeps
 * the suite hermetic: no MongoDB, no Cloudinary, no live third-party service is
 * required to run it locally or in CI.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  outputDir: "test-results",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev:client",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});