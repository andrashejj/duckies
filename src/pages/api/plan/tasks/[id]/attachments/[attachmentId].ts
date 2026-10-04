import type { APIRoute } from "astro";
import { planIdPattern } from "../../../../../../lib/plan";
import { PlanError, planRoute } from "../../../../../../lib/server/plan";
import { downloadTaskAttachment } from "../../../../../../lib/server/plan-discussion";
export const prerender = false;
export const GET: APIRoute = planRoute(async ({ params }) => {
  if (!params.id || !planIdPattern.test(params.id) || !params.attachmentId || !/^[a-f0-9-]{36}$/.test(params.attachmentId)) throw new PlanError("Attachment not found.", 404);
  return downloadTaskAttachment(params.id, params.attachmentId);
});
