// A small wrapper over a node-postgres Pool: plain parameterised queries
// and transactions. No "server-only" import here, so `npm run
// test:accounts` (plain Node) can use it; lib/db/pool.ts is the site's.
import type { Pool, PoolClient, QueryResultRow } from "pg";

export type Queryable = {
  query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<{ rows: R[] }>;
};

export type Db = Queryable & {
  /** Runs fn in one transaction: committed if it returns, rolled back if it throws. */
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
};

export function poolDb(pool: Pool): Db {
  return {
    query: (text, values) => pool.query(text, values),
    async transaction(fn) {
      const client: PoolClient = await pool.connect();
      try {
        await client.query("begin");
        const result = await fn(client);
        await client.query("commit");
        return result;
      } catch (error) {
        await client.query("rollback").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
