import type { APIRoute } from "astro";
import { compRoute, judgeAccess, loadJudgeState } from "../../../../lib/server/comp";
import { json } from "../../../../lib/server/http";
export const prerender = false;

// The judge sheet: who is judging, the heats, and only this judge's own scores.
// The middleware requires a session; judgeAccess checks the invitation.
export const GET: APIRoute = compRoute(async ({ request }) => json(await loadJudgeState(await judgeAccess(request))));
