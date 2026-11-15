import { defineConfig, devices } from "@playwright/test";

// Browser tests: the in-browser JVM can only be checked in a real browser.
// Starts the dev server unless one is already running on the port. Next.js
// runs one dev server per folder, so with `npm run dev` already running on
// 3000, use it: E2E_PORT=3000 npm run test:e2e.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  // Each test starts its own JVM; a cold start downloads the runtime.
  timeout: 5 * 60_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  // CI reaches CheerpJ's CDN over the internet; one retry absorbs a network
  // blip, and a retried test is reported as flaky rather than hidden.
  retries: CI ? 1 : 0,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}/lab`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
