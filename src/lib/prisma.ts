import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: import.meta.env.DEV ? ["warn", "error"] : ["error"],
  });

if (import.meta.env.DEV) {
  globalThis.__prisma = prisma;
}
