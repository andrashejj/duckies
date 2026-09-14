import { type AppPrismaClient, createPrismaClient } from "./prisma-factory";

let instance: AppPrismaClient | undefined;
// Lazy initialization keeps static page builds independent of database setup.
export const prisma = new Proxy({} as AppPrismaClient, {
  get(_target, property) {
    instance ??= createPrismaClient();
    const value = Reflect.get(instance, property);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
