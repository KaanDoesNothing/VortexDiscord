import { join } from "node:path";
import { drizzle } from "drizzle-orm/bun-sql";
import { migrate } from "drizzle-orm/bun-sql/migrator";
import * as schema from "./schema";

if (!Bun.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (e.g. postgres://user:pass@localhost:5432/vortex)");

export const db = drizzle({ connection: Bun.env.DATABASE_URL, schema });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Applies any pending SQL migrations from ./drizzle. Safe to run on every start. */
export async function runMigrations() {
    await migrate(db, { migrationsFolder: join(import.meta.dir, "../../drizzle") });
}
