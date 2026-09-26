import { execFileSync } from "node:child_process";

// Part of `pnpm build`. `vercel.json`'s ignoreCommand already keeps every
// branch but staging and main from reaching a Vercel build at all, so this
// only ever needs to pick which of those two databases to migrate; a local
// `pnpm build` has no VERCEL env var and is always a no-op here (run
// `pnpm db:migrate` yourself against DUCKIES_DATABASE_URL instead).
const branch = process.env.VERCEL_GIT_COMMIT_REF;
if (process.env.VERCEL && (branch === "staging" || branch === "main")) {
  const target = branch === "staging" ? "staging" : "production";
  console.log(`Vercel build on ${branch}: applying migrations to ${target}.`);
  execFileSync("pnpm", ["exec", "tsx", "scripts/db-target.ts", target, "migrate"], { stdio: "inherit" });
}
