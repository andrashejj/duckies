import type { APIRoute } from "astro";
import { planIdPattern, taskPatchSchema } from "../../../../lib/plan";
import { planRoute, readPlanBody, requirePlanEditor, updateTask, PlanError } from "../../../../lib/server/plan";
import { json } from "../../../../lib/server/http";
export const prerender=false;
export const PATCH: APIRoute=planRoute(async ({request,params})=>{
  if(!params.id||!planIdPattern.test(params.id))throw new PlanError("Task not found.",404);
  const actor=await requirePlanEditor(request);
  const parsed=taskPatchSchema.safeParse(await readPlanBody(request));
  if(!parsed.success)return json({error:parsed.error.issues[0]?.message??"Invalid change."},400);
  const {version,...patch}=parsed.data;
  return json({task:await updateTask(params.id,patch,version,actor)});
});
