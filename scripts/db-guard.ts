import { getDatabase } from "../src/lib/server/db";

// Runs before `prisma migrate deploy`: refuse to touch a legacy Auth.js
// database. Its uppercase "User" table holds real shop records that need a
// reviewed export/import, not a migration.
const db = getDatabase();
try {
  const legacy = await db.query(`SELECT to_regclass('public."User"') AS legacy`);
  if (legacy.rows[0].legacy) throw new Error("Legacy Auth.js database detected. Use a dedicated Duckies database and review a data import before migrating. No tables were changed.");
} finally {
  await db.end();
}
