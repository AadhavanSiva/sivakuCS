// The database for the browser tests (playwright.config.ts starts it):
// an in-memory Postgres with the schema, on port 54329 or the one given.
//   npx tsx scripts/test-db.ts [port]
import { startTestPostgres } from "./lib/test-postgres";

async function main() {
  const port = Number(process.argv[2] ?? 54329);
  const { url, stop } = await startTestPostgres(port);
  console.log(`Test Postgres ready: ${url}`);
  const shutdown = () => void stop().finally(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
