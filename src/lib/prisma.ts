import { type AppPrismaClient, createPrismaClient } from "./prisma-factory";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: AppPrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  createPrismaClient({
    log: import.meta.env.DEV ? ["warn", "error"] : ["error"],
  });

if (import.meta.env.DEV) {
  globalThis.__prisma = prisma;
}
