import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { installApiMocks } from "./mocks/api.js";

/**
 * Cross-app E2E suite — the complete sales-demo flow:
 *
 *   Login → Room Selection → Tile Application → PDF Export
 *
 * Runs against the Vite dev server (see playwright.config.ts webServer) with
 * every backend call fulfilled by tests/e2e/mocks/api.js, so no MongoDB,
 * Cloudinary, or other live service is required.
 */
test.describe("Sales-demo flow", () => {
  test.beforeEach(async ({ page }) => {
    await installApiMocks(page);
  });

  test("login, pick a room, apply a tile, and export the room as a PDF", async ({ page }) => {
    // ---- 1. Login ----
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Admin Sign In" })).toBeVisible();

    await page.getByPlaceholder("Enter username").fill("admin");
    await page.getByPlaceholder("Enter password").fill("admin123");
    await page.getByRole("button", { name: /Sign In/ }).click();

    // The dashboard loads: the rep-facing room selector is present.
    const kitchenRoom = page.getByRole("button", { name: "Kitchen" });
    await expect(kitchenRoom).toBeVisible();

    // ---- 2. Room selection ----
    // Selecting Kitchen auto-advances through the published-layout picker
    // (exactly one published layout) and enables tile application.
    await kitchenRoom.click();

    const arubaTile = page.getByRole("button", { name: "Iridium Aruba Armani" });
    await expect(arubaTile).toBeVisible();
    await expect(arubaTile).toBeEnabled();

    // ---- 3. Tile application ----
    await arubaTile.click();
    const appliedTile = page.getByTestId("applied-tile");
    await expect(appliedTile).toBeVisible();
    await expect(appliedTile).toContainText("Iridium Aruba Armani");

    // ---- 4. PDF export ----
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-pdf").click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^tile-visualizer-kitchen-.*\.pdf$/);

    // The downloaded file is a real PDF document (starts with the %PDF magic).
    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const header = readFileSync(filePath).subarray(0, 5).toString("ascii");
    expect(header).toBe("%PDF-");
  });
});