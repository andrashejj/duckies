import { familyAccess } from "./server/family-access";
import { getAuth } from "./server/auth";
import { findMember } from "./server/db";

export async function getSession(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified) return null;
  const [member, access] = await Promise.all([findMember(session.user.email), familyAccess(session.user.email)]);
  return { ...session, user: { ...session.user, role: member?.role === "organiser" ? "ADMIN" as const : "CUSTOMER" as const }, member, family: access.family, canShop: !!member || access.familyMember };
}

export type SharedSession = Awaited<ReturnType<typeof getSession>>;
export function isAdmin(session: SharedSession) { return session?.user.role === "ADMIN"; }
