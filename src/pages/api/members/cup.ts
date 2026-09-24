import type { APIRoute } from "astro";
import { compRoute } from "../../../lib/server/comp";
import { loadMemberCup, memberAccess } from "../../../lib/server/cup-members";
import { json } from "../../../lib/server/http";
export const prerender = false;

// The members' cup board: the lineup, the draw, the judges by name and the
// scores as they land. Read-only, and only for signed-in club members.
export const GET: APIRoute = compRoute(async ({ request }) => json(await loadMemberCup(await memberAccess(request))));
