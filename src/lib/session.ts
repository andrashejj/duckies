import { archiveDate } from "./server/member-archive";
import { familyAccess } from "./server/family-access";
import { getAuth } from "./server/auth";
import { findMember } from "./server/db";
import { isCoach } from "./server/coaches";

export async function getSession(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified) return null;
  const [member, access, archivedAt, coach] = await Promise.all([findMember(session.user.email), familyAccess(session.user.email), archiveDate(session.user.email), isCoach(session.user.email)]);
  return { ...session, user: { ...session.user, role: member?.role === "organiser" ? "ADMIN" as const : "CUSTOMER" as const }, member, archivedAt, family: access.family, coach, canShop: !!member || access.familyMember };
}

export type SharedSession = Awaited<ReturnType<typeof getSession>>;
export function isAdmin(session: SharedSession) { return session?.user.role === "ADMIN"; }
