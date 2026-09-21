import { getSession } from "../../lib/session";
import { safeRoute } from "../../lib/registration/http";
import { json } from "../../lib/server/http";
export const prerender = false;
// Shared public pages only request navigation state, never roster or family data.
export const GET = safeRoute(async ({ request }) => {
  const session = await getSession(request);
  const admin = session?.user.role === "ADMIN";
  return json({ signedIn: !!session, member: !!session?.member, family: !!session?.family, admin,
    home: !session ? "/login" : admin ? "/admin/kids" : (session.member || session.family) ? "/members/profile" : "/account" });
});
