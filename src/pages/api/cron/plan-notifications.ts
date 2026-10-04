import type { APIRoute } from "astro";
import { timingSafeEqual } from "node:crypto";
import { deliverTaskNotifications } from "../../../lib/server/plan-notifications";
import { json } from "../../../lib/server/http";

export const prerender = false;
export const GET: APIRoute = async ({ request }) => {
  const secret = process.env.CRON_SECRET;
  const auth = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || auth.length !== expected.length || !timingSafeEqual(auth, expected)) return json({ error: "Unauthorized." }, 401);
  try { return json(await deliverTaskNotifications()); }
  catch { console.error("Task notification retry failed."); return json({ error: "Retry failed." }, 503); }
};
