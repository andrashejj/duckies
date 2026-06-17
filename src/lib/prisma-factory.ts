import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

type LogLevel = "info" | "query" | "warn" | "error";

export function createPrismaClient(options: { log?: LogLevel[] } = {}) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Run `pnpm db:dev` and copy the printed `postgres://` URL into .env.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
    log: options.log,
  });
}

export type AppPrismaClient = ReturnType<typeof createPrismaClient>;
