import { z } from "zod";

// Project Molt plan: milestones (timeline steps and hard dates) and the tasks
// under them, each with an owner and a to-do / doing / done status. Shared by
// the brief, the timeline and the board; stored in plan_* tables (009).

export const planTracks = ["phase1", "estelle", "dates"] as const;
export type PlanTrack = (typeof planTracks)[number];
export const taskStatuses = ["todo", "doing", "done"] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export const statusLabels: Record<TaskStatus, string> = { todo: "To do", doing: "Doing", done: "Done" };
export const trackLabels: Record<PlanTrack, string> = { phase1: "Phase 1", estelle: "Estelle onsite", dates: "Hard date" };

export type PlanPerson = { id: string; name: string; email: string | null; sort: number };
export type PlanLink = { label: string; file: string };
export type PlanTask = { id: string; milestoneId: string; text: string; ownerId: string | null; dueOn: string | null; status: TaskStatus; sort: number; version: number; updatedAt: string };
export type PlanMilestone = {
  id: string; track: PlanTrack; code: string; title: string; dateLabel: string; startsOn: string; endsOn: string;
  deliverable: string; ownerId: string | null; links: PlanLink[]; sort: number; tasks: PlanTask[];
};
export type PlanData = { people: PlanPerson[]; milestones: PlanMilestone[]; canEdit: boolean };

export const planIdPattern = /^[a-z][a-z0-9-]{1,40}$/;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");
export const taskPatchSchema = z.object({
  status: z.enum(taskStatuses).optional(),
  ownerId: z.string().regex(planIdPattern).nullable().optional(),
  version: z.number().int().positive(),
}).refine(patch => patch.status !== undefined || patch.ownerId !== undefined, { message: "Nothing to change." });
export const taskCreateSchema = z.object({
  milestoneId: z.string().regex(planIdPattern),
  text: z.string().trim().min(3, "Say what the task is.").max(400, "Keep a task under 400 characters."),
  ownerId: z.string().regex(planIdPattern).nullable(),
  dueOn: isoDate.nullable(),
});

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-10-02" → "Fri 2 Oct". Dates are calendar days, so avoid timezone shifts. */
export function formatDay(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${dayNames[date.getUTCDay()]} ${d} ${monthNames[m - 1]}`;
}
export function personName(people: PlanPerson[], id: string | null) {
  return id ? people.find(person => person.id === id)?.name ?? id : "Unassigned";
}
export function progress(milestones: PlanMilestone[]) {
  const tasks = milestones.flatMap(milestone => milestone.tasks);
  const count = (status: TaskStatus) => tasks.filter(task => task.status === status).length;
  return { total: tasks.length, todo: count("todo"), doing: count("doing"), done: count("done") };
}
