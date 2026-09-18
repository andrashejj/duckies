import type { APIRoute } from "astro";
import { compRoute, loadLineup } from "../../../lib/server/comp";
import { json } from "../../../lib/server/http";
export const prerender = false;

// Public: who is in the Cup, in sign-up order — first name and an initial,
// age, member or wildcard. Heats and colours join once the board is live.
export const GET: APIRoute = compRoute(async () => json(await loadLineup()));
