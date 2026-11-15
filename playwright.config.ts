import { defineConfig, devices } from "@playwright/test";

// Browser tests: the in-browser JVM can only be checked in a real browser.
// Starts the dev server unless one is already running on the port.
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  // Each test starts its own JVM; a cold start downloads the runtime.
  timeout: 5 * 60_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
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
