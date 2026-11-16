import "server-only";
// The site's database: Neon Postgres over a standard TCP connection with a
// pool, as Neon recommends for Vercel Functions (attachDatabasePool lets
// Vercel close idle connections before a function is suspended).
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";
import { type Db, poolDb } from "./db";

let db: Db | undefined;

export function getDb(): Db {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set; see README, Accounts.");
    // The browser tests' in-memory Postgres takes one connection at a time.
    const max = Number(process.env.DATABASE_POOL_MAX) || 10;
    const pool = new Pool({ connectionString, max });
    attachDatabasePool(pool);
    db = poolDb(pool);
  }
  return db;
}
