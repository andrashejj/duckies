import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "@auth/core/providers/google";
import { defineConfig } from "auth-astro";

import { prisma } from "./src/lib/prisma";

export default defineConfig({
  adapter: PrismaAdapter(prisma) as unknown as ReturnType<typeof PrismaAdapter>,
  providers: [Google({})],
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        // @ts-expect-error — extended on Session type in src/types/auth.d.ts
        session.user.id = user.id;
        // @ts-expect-error — extended on Session type in src/types/auth.d.ts
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
