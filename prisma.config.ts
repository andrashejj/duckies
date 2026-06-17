import "dotenv/config";
import { defineConfig } from "prisma/config";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "Set DATABASE_URL (or DIRECT_URL) in .env. For local PGlite, run `pnpm db:dev` and paste the URL it prints.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url,
  },
});
