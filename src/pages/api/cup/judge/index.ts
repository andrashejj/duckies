import type { APIRoute } from "astro";
import { compRoute, cupAccess, loadJudgeState } from "../../../../lib/server/comp";
import { json } from "../../../../lib/server/http";
export const prerender = false;

// The judge sheet: who is judging, the heats, and only this judge's own scores.
// Every signed-in parent can watch their approval status without reloading.
export const GET: APIRoute = compRoute(async ({ request }) => json(await loadJudgeState(await cupAccess(request))));
