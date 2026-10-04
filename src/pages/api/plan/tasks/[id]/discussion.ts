import type { APIRoute } from "astro";
import { planIdPattern } from "../../../../../lib/plan";
import { PlanError, planRoute, requirePlanEditor } from "../../../../../lib/server/plan";
import { readTaskDiscussion, readTaskMessage, addTaskMessage } from "../../../../../lib/server/plan-discussion";
import { json } from "../../../../../lib/server/http";
export const prerender = false;

function taskId(id: string | undefined) {
  if (!id || !planIdPattern.test(id)) throw new PlanError("Task not found.", 404);
  return id;
}
export const GET: APIRoute = planRoute(async ({ params, locals }) =>
  json({ ...await readTaskDiscussion(taskId(params.id)), canEdit: Boolean(locals.branding?.canEdit) }));

export const POST: APIRoute = planRoute(async ({ request, params }) => {
  const id = taskId(params.id);
  const actor = await requirePlanEditor(request);
  const input = await readTaskMessage(request);
  return json({ id: await addTaskMessage(id, input, actor) }, 201);
});
