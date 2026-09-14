import { readFile } from "node:fs/promises";
import { getMigrations } from "better-auth/db/migration";
import { getAuthOptions } from "../src/lib/server/auth";
import { getDatabase } from "../src/lib/server/db";

const db = getDatabase();
try {
  // Better Auth plans additive migrations; no schema push or table drops.
  const plan = await getMigrations(getAuthOptions());
  await plan.runMigrations();
  await db.query(await readFile(new URL("../db/001-club.sql", import.meta.url), "utf8"));
  console.log("Duckies database migrations complete.");
} finally {
  await db.end();
}
