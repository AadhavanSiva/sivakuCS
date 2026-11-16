import { defineConfig, devices } from "@playwright/test";
import { STUDENT_STATE } from "./e2e/helpers";

// Browser tests: the in-browser JVM can only be checked in a real browser.
// Starts two servers unless they are already running: an in-memory Postgres
// with the schema (scripts/test-db.ts), and a dev server that uses it, with
// the test login switched on (lib/test-login.ts) since a test cannot sign
// in with Google. The dev server builds into .next-e2e, so it runs happily
// beside your own `npm run dev`, and never touches your .env.local database:
// the variables below take precedence over .env.local.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const DB_PORT = Number(process.env.E2E_DB_PORT ?? 54329);
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
  },
  projects: [
    // Signs in once as a test student; the other tests start signed in.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: STUDENT_STATE },
    },
  ],
  webServer: [
    {
      command: `npx tsx scripts/test-db.ts ${DB_PORT}`,
      port: DB_PORT,
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
    {
      command: `npm run dev -- --port ${PORT}`,
      url: `http://localhost:${PORT}/privacy`,
      reuseExistingServer: !CI,
      timeout: 180_000,
      env: {
        NEXT_DIST_DIR: ".next-e2e",
        DATABASE_URL: `postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres?sslmode=disable`,
        DATABASE_POOL_MAX: "1",
        SIVAKU_TEST_LOGIN: "1",
        // Not secrets: values for this local test server only.
        AUTH_SECRET: "e2e-only-value-not-a-secret-0123456789abcdef",
        AUTH_GOOGLE_ID: "e2e-not-used",
        AUTH_GOOGLE_SECRET: "e2e-not-used",
      },
    },
  ],
});
