import type { APIRoute } from "astro";
import { taskCreateSchema } from "../../../lib/plan";
import { createTask, loadPlan, planRoute, readPlanBody, requirePlanEditor } from "../../../lib/server/plan";
import { json } from "../../../lib/server/http";
export const prerender=false;
export const GET: APIRoute=planRoute(async ({locals})=>{
  const plan=await loadPlan();
  return json({...plan,canEdit:Boolean(locals.branding?.canEdit)});
});
export const POST: APIRoute=planRoute(async ({request})=>{
  const actor=await requirePlanEditor(request);
  const parsed=taskCreateSchema.safeParse(await readPlanBody(request));
  if(!parsed.success)return json({error:parsed.error.issues[0]?.message??"Invalid task."},400);
  return json({task:await createTask(parsed.data,actor)},201);
});
