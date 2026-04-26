import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "@auth/core/providers/google";
import { defineConfig } from "auth-astro";

import { prisma } from "./src/lib/prisma";

export default defineConfig({
  adapter: PrismaAdapter(prisma),
  providers: [Google({})],
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: "CUSTOMER" | "ADMIN" }).role ?? "CUSTOMER";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email || !user.id) return;
      const role = user.email.toLowerCase().endsWith("@sunsetduckies.com")
        ? "ADMIN"
        : "CUSTOMER";
      await prisma.user.update({
        where: { id: user.id },
        data: { role },
      });
    },
    async signIn({ user }) {
      if (!user?.email || !user.id) return;
      const expectedRole = user.email.toLowerCase().endsWith("@sunsetduckies.com")
        ? "ADMIN"
        : "CUSTOMER";
      await prisma.user
        .update({
          where: { id: user.id },
          data: { role: expectedRole },
        })
        .catch(() => {
          // new user: createUser event will handle it
        });
    },
  },
});
