// npm run db:migrate: creates the tables in db/schema.sql in the database
// named by DATABASE_URL (from the environment, or .env.local). Safe to run
// again: it only adds what is missing. Prints the tables afterwards.
import { readFileSync } from "node:fs";
import { Client } from "pg";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: DATABASE_URL must be in the environment.
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Put it in .env.local (see README, Accounts).");
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(readFileSync("db/schema.sql", "utf8"));
    const { rows } = await client.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    );
    console.log(`Schema applied. Tables: ${rows.map((r) => r.table_name).join(", ")}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
