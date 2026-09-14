import { execFileSync } from "node:child_process";

export default async function setup() {
  execFileSync("pnpm", ["db:migrate"], { stdio: "inherit", env: process.env });
}
