import type { APIRoute } from "astro";
import { compRoute, loadLive } from "../../../lib/server/comp";
import { json } from "../../../lib/server/http";
export const prerender = false;

// The public leaderboard feed: names, colours and scores, nothing else about
// the kids — and nothing at all until an organiser switches the board live.
export const GET: APIRoute = compRoute(async () => json(await loadLive()));
