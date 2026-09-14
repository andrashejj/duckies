import { readFile, readdir } from "node:fs/promises";
import { getMigrations } from "better-auth/db/migration";
import { getAuthOptions } from "../src/lib/server/auth";
import { getDatabase } from "../src/lib/server/db";

const db = getDatabase();
const client = await db.connect();
try {
  await client.query("SELECT pg_advisory_lock(94831721)");
  const legacy = await client.query(`SELECT to_regclass('public."User"') AS legacy`);
  if (legacy.rows[0].legacy) throw new Error("Legacy Auth.js database detected. Use a dedicated Duckies database and review a data import before migration. No tables were changed.");
  const plan = await getMigrations(getAuthOptions());
  await plan.runMigrations();
  await client.query("CREATE TABLE IF NOT EXISTS club_migration (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const directory = new URL("../db/", import.meta.url);
  const names = (await readdir(directory)).filter(name => /^\d+-.*\.sql$/.test(name)).sort();
  for (const name of names) {
    if ((await client.query("SELECT 1 FROM club_migration WHERE name = $1", [name])).rowCount) continue;
    await client.query("BEGIN");
    try {
      await client.query(await readFile(new URL(name, directory), "utf8"));
      await client.query("INSERT INTO club_migration (name) VALUES ($1)", [name]);
      await client.query("COMMIT");
      console.log(`Applied ${name}.`);
    } catch (error) { await client.query("ROLLBACK"); throw error; }
  }
  console.log("Duckies database migrations complete.");
} finally {
  await client.query("SELECT pg_advisory_unlock(94831721)");
  client.release();
  await db.end();
}
