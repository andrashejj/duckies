import type { Session } from "@auth/core/types";
import { getSession as authGetSession } from "auth-astro/server";

export async function getSession(
  request: Request,
): Promise<Session | null> {
  if (!process.env.AUTH_SECRET) {
    // Build-time or unconfigured env: no session is knowable. Stay quiet.
    return null;
  }
  try {
    return await authGetSession(request);
  } catch (err) {
    console.error("[session] read failed:", err);
    return null;
  }
}

export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === "ADMIN";
}

export function isAuthenticated(session: Session | null): boolean {
  return Boolean(session?.user?.id);
}
