import { execFileSync } from "node:child_process";
import { config } from "dotenv";

// `pnpm db:migrate:staging`, `pnpm db:status:production`, …: run a database
// command against a named environment. The URLs live in the local .env as
// STAGING_DATABASE_URL and PRODUCTION_DATABASE_URL (direct, unpooled
// connections); DUCKIES_DATABASE_URL stays the local database.
config({ quiet: true });
const [target, command = "migrate", failedMigration] = process.argv.slice(2);
const url = target && process.env[`${target.toUpperCase()}_DATABASE_URL`];
if (!url || !["migrate", "status", "rolled-back"].includes(command) || (command === "rolled-back") !== Boolean(failedMigration)) {
  console.error("Usage: tsx scripts/db-target.ts <staging|production> [migrate|status|rolled-back <migration>]  (needs <TARGET>_DATABASE_URL in .env)");
  process.exit(1);
}
const host = new URL(url).host;
console.log(`${command} → ${target} (${host})`);
// `rolled-back` marks a failed migration as rolled back so the next `migrate`
// retries it (after the cause is fixed) — Prisma refuses to apply anything
// while a failed migration is on record.
const args = command === "status" ? ["exec", "prisma", "migrate", "status"]
  : command === "rolled-back" ? ["exec", "prisma", "migrate", "resolve", "--rolled-back", failedMigration!]
  : ["db:migrate"];
// `migrate status` exits 1 when migrations are pending; pass the code through quietly.
try { execFileSync("pnpm", args, { stdio: "inherit", env: { ...process.env, DUCKIES_DATABASE_URL: url } }); }
catch (error) { process.exit(typeof (error as { status?: number }).status === "number" ? (error as { status: number }).status : 1); }
