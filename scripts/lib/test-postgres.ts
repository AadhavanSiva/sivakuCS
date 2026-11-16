// An in-memory Postgres (PGlite, Postgres compiled to WebAssembly) with the
// site's schema, served on a local port so the site's own driver (pg)
// talks to it exactly as it talks to Neon. For tests only: nothing is
// written to disk and everything is gone when the process ends.
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

export async function startTestPostgres(port: number) {
  const db = new PGlite("memory://");
  await db.waitReady;
  await db.exec(readFileSync("db/schema.sql", "utf8"));
  // PGlite runs one session; with one connection at a time a transaction
  // can never interleave with another client's queries.
  const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 1 });
  await server.start();
  return {
    url: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`,
    async stop() {
      await server.stop();
      await db.close();
    },
  };
}
