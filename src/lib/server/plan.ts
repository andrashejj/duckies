import type { APIRoute } from "astro";
import { randomBytes } from "node:crypto";
import type pg from "pg";
import { planMilestones, planPeople } from "../../data/plan-tasks";
import type { PlanData, PlanMilestone, PlanPerson, PlanTask, TaskStatus } from "../plan";
import { getBrandingAccess } from "./branding";
import { getDatabase } from "./db";
import { json, sameOrigin } from "./http";

export class PlanError extends Error { constructor(message: string, public status = 400) { super(message); } }
export const planRoute = (handler: APIRoute): APIRoute => async context => {
  try {
    const access = context.locals.branding ?? await getBrandingAccess(context.request);
    context.locals.branding = access;
    if (!access.canView) throw new PlanError("Branding access requires approval.", access.session ? 403 : 401);
    return await handler(context);
  } catch (error) {
    if (error instanceof PlanError) return json({ error: error.message }, error.status);
    console.error("Plan board request failed.");
    return json({ error: "The plan board is temporarily unavailable. Please retry." }, 503);
  }
};
export async function requirePlanEditor(request: Request) {
  const access = await getBrandingAccess(request);
  if (!access.session) throw new PlanError("Sign in to change the plan.", 401);
  if (!access.canEdit) throw new PlanError("Changing tasks needs edit access from Andras.", 403);
  if (!sameOrigin(request)) throw new PlanError("Invalid request origin.", 403);
  return access.email!;
}
export async function readPlanBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new PlanError("A request body is required.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length; if (size > 8192) { await reader.cancel(); throw new PlanError("Request is too large.", 413); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new PlanError("Invalid JSON."); }
}

type MilestoneRow = { id: string; code: string; title: string; date_label: string; due_on: string; deliverable: string; owner_id: string | null; links: PlanMilestone["links"]; sort: number };
type TaskRow = { id: string; milestone_id: string; text: string; owner_id: string | null; due_on: string | null; status: TaskStatus; sort: number; version: number; updated_at: Date };
const taskFromRow = (row: TaskRow): PlanTask => ({ id: row.id, milestoneId: row.milestone_id, text: row.text, ownerId: row.owner_id, dueOn: row.due_on, status: row.status, sort: row.sort, version: row.version, updatedAt: row.updated_at.toISOString() });

async function readPlan(client: pg.PoolClient | pg.Pool): Promise<Omit<PlanData, "canEdit">> {
  // Dates come back as text so calendar days never shift with the server timezone.
  const people = await client.query<PlanPerson>("SELECT id,name,email,sort FROM plan_person ORDER BY sort,id");
  const milestones = await client.query<MilestoneRow>("SELECT id,code,title,date_label,due_on::text,deliverable,owner_id,links,sort FROM plan_milestone ORDER BY sort,id");
  const tasks = await client.query<TaskRow>("SELECT id,milestone_id,text,owner_id,due_on::text,status,sort,version,updated_at FROM plan_task ORDER BY sort,created_at,id");
  return {
    people: people.rows,
    milestones: milestones.rows.map(row => ({
      id: row.id, code: row.code, title: row.title, dateLabel: row.date_label, dueOn: row.due_on,
      deliverable: row.deliverable, ownerId: row.owner_id, links: row.links, sort: row.sort,
      tasks: tasks.rows.filter(task => task.milestone_id === row.id).map(taskFromRow),
    })),
  };
}

/** Loads the plan, seeding it from src/data/plan-tasks.ts when the tables are still empty. */
export async function loadPlan(): Promise<Omit<PlanData, "canEdit">> {
  const db = getDatabase();
  const empty = (await db.query("SELECT 1 FROM plan_milestone LIMIT 1")).rowCount === 0;
  if (empty) await seedPlan();
  return readPlan(db);
}
async function seedPlan() {
  const client = await getDatabase().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext('plan:seed'))");
    if ((await client.query("SELECT 1 FROM plan_milestone LIMIT 1")).rowCount) { await client.query("COMMIT"); return; }
    for (const [index, person] of planPeople.entries())
      await client.query("INSERT INTO plan_person(id,name,email,sort) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING", [person.id, person.name, person.email, index]);
    for (const [index, milestone] of planMilestones.entries()) {
      await client.query("INSERT INTO plan_milestone(id,code,title,date_label,due_on,deliverable,owner_id,links,sort) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [milestone.id, milestone.code, milestone.title, milestone.dateLabel, milestone.dueOn, milestone.deliverable, milestone.owner, JSON.stringify(milestone.links ?? []), index]);
      for (const [taskIndex, task] of milestone.tasks.entries())
        await client.query("INSERT INTO plan_task(id,milestone_id,text,owner_id,due_on,sort) VALUES($1,$2,$3,$4,$5,$6)",
          [`${milestone.id}-${taskIndex + 1}`, milestone.id, task.text, task.owner, task.due, taskIndex]);
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function updateTask(id: string, patch: { status?: TaskStatus; ownerId?: string | null }, expectedVersion: number, actor: string): Promise<PlanTask> {
  const client = await getDatabase().connect();
  try {
    await client.query("BEGIN");
    if (patch.ownerId && !(await client.query("SELECT 1 FROM plan_person WHERE id=$1", [patch.ownerId])).rowCount) throw new PlanError("Unknown owner.", 400);
    const result = await client.query<TaskRow>(`UPDATE plan_task SET status=COALESCE($3,status),owner_id=CASE WHEN $4 THEN $5 ELSE owner_id END,
      version=version+1,updated_at=now(),updated_by=$6 WHERE id=$1 AND version=$2
      RETURNING id,milestone_id,text,owner_id,due_on::text,status,sort,version,updated_at`,
      [id, expectedVersion, patch.status ?? null, patch.ownerId !== undefined, patch.ownerId ?? null, actor]);
    if (!result.rowCount) {
      const exists = (await client.query("SELECT 1 FROM plan_task WHERE id=$1", [id])).rowCount;
      throw new PlanError(exists ? "This task changed in another window. Reload the board and try again." : "Task not found.", exists ? 409 : 404);
    }
    const task = taskFromRow(result.rows[0]);
    await client.query("INSERT INTO plan_task_event(task_id,status,owner_id,actor) VALUES($1,$2,$3,$4)", [task.id, task.status, task.ownerId, actor]);
    await client.query("COMMIT");
    return task;
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function createTask(input: { milestoneId: string; text: string; ownerId: string | null; dueOn: string | null }, actor: string): Promise<PlanTask> {
  const client = await getDatabase().connect();
  try {
    await client.query("BEGIN");
    if (!(await client.query("SELECT 1 FROM plan_milestone WHERE id=$1", [input.milestoneId])).rowCount) throw new PlanError("Unknown milestone.", 400);
    if (input.ownerId && !(await client.query("SELECT 1 FROM plan_person WHERE id=$1", [input.ownerId])).rowCount) throw new PlanError("Unknown owner.", 400);
    const id = `t-${randomBytes(6).toString("hex")}`;
    const result = await client.query<TaskRow>(`INSERT INTO plan_task(id,milestone_id,text,owner_id,due_on,sort,created_by,updated_by)
      VALUES($1,$2,$3,$4,$5,(SELECT COALESCE(MAX(sort),-1)+1 FROM plan_task WHERE milestone_id=$2),$6,$6)
      RETURNING id,milestone_id,text,owner_id,due_on::text,status,sort,version,updated_at`, [id, input.milestoneId, input.text, input.ownerId, input.dueOn, actor]);
    const task = taskFromRow(result.rows[0]);
    await client.query("INSERT INTO plan_task_event(task_id,status,owner_id,actor) VALUES($1,$2,$3,$4)", [task.id, task.status, task.ownerId, actor]);
    await client.query("COMMIT");
    return task;
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

// ---------- Server-rendered pages (overview, plan, onsite) ----------
const seedAsPlan = (): Omit<PlanData, "canEdit"> => ({
  people: planPeople.map((person, sort) => ({ ...person, sort })),
  milestones: planMilestones.map((m, sort) => ({
    id: m.id, code: m.code, title: m.title, dateLabel: m.dateLabel, dueOn: m.dueOn, deliverable: m.deliverable, ownerId: m.owner, links: m.links ?? [], sort,
    tasks: m.tasks.map((task, index) => ({ id: `${m.id}-${index + 1}`, milestoneId: m.id, text: task.text, ownerId: task.owner, dueOn: task.due, status: "todo" as const, sort: index, version: 1, updatedAt: "" })),
  })),
});
/** The plan for a server-rendered page; the seed stands in (flagged `live: false`) when the database is unreachable. */
export async function loadPlanForPages(): Promise<{ plan: Omit<PlanData, "canEdit">; live: boolean }> {
  try { return { plan: await loadPlan(), live: true }; }
  catch { console.error("Plan could not be read; showing the seed."); return { plan: seedAsPlan(), live: false }; }
}
