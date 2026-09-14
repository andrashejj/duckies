import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { getDatabase } from "./server/db";

export function createPrismaClient() {
  return new PrismaClient({ adapter: new PrismaPg(getDatabase(), { disposeExternalPool: false }) });
}
export type AppPrismaClient = ReturnType<typeof createPrismaClient>;
