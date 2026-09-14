import { execFileSync } from "node:child_process";
import pg from "pg";

export default async function setup() {
  execFileSync("pnpm", ["db:migrate"], { stdio: "inherit", env: process.env });
  const db = new pg.Pool({ connectionString: process.env.DUCKIES_DATABASE_URL });
  try { await db.query("UPDATE club_semester SET is_current=false WHERE is_current"); await db.query("UPDATE club_semester SET is_current=true WHERE id='2026-S2'"); } finally { await db.end(); }
}
