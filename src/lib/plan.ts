import { z } from "zod";

// Project Molt plan: seven milestones with one due date each, and the tasks
// under them, each with an owner and a to do / doing / review / done status
// (Estelle does the work and moves it to review; Dori signs it off). Shared by
// the plan, onsite and overview pages and the board; stored in plan_* tables
// (009, reshaped by 010 and 011).

export const taskStatuses = ["todo", "doing", "review", "done"] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export const statusLabels: Record<TaskStatus, string> = { todo: "To do", doing: "Doing", review: "Review", done: "Done" };

export type PlanPerson = { id: string; name: string; email: string | null; sort: number };
export type PlanLink = { label: string; file: string };
export type PlanTask = { id: string; milestoneId: string; text: string; ownerId: string | null; dueOn: string | null; status: TaskStatus; sort: number; version: number; updatedAt: string };
export type PlanMilestone = {
  id: string; code: string; title: string; dateLabel: string; dueOn: string;
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
  return { total: tasks.length, todo: count("todo"), doing: count("doing"), review: count("review"), done: count("done") };
}

/** Milestones in the order they fall due. */
export function byDue(milestones: PlanMilestone[]) {
  return [...milestones].sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.sort - b.sort);
}
/** The soonest milestone that still has open tasks: the one the board flags as up next. */
export function nextMilestone(milestones: PlanMilestone[]) {
  return byDue(milestones).find(milestone => milestone.tasks.some(task => task.status !== "done")) ?? null;
}
/** Days from `today` to an ISO date; negative when it has passed. */
export function daysUntil(iso: string, today: string) {
  return Math.round((Date.parse(iso) - Date.parse(today)) / 86_400_000);
}
export type Urgency = "overdue" | "soon" | null;
/** Open tasks that have slipped, or fall due within the week, get flagged on every page. */
export function urgency(task: Pick<PlanTask, "dueOn" | "status">, today: string): Urgency {
  if (!task.dueOn || task.status === "done") return null;
  const days = daysUntil(task.dueOn, today);
  return days < 0 ? "overdue" : days <= 7 ? "soon" : null;
}

// Estelle's onsite weeks: the same tasks bucketed by when they fall due.
export const onsiteWeeks = [
  { id: "before", title: "Before she lands", dateLabel: "By Mon 28 Sep", until: "2026-09-28" },
  { id: "w1", title: "Week 1 · Land, bake, first taste", dateLabel: "Tue 29 Sep – Sun 4 Oct", until: "2026-10-04" },
  { id: "w2", title: "Week 2 · Shops, customers, the numbers", dateLabel: "Mon 5 – Sun 11 Oct", until: "2026-10-11" },
  { id: "w3", title: "Week 3 · Go / no-go, first batch, the Cup", dateLabel: "Mon 12 – Sun 18 Oct", until: "2026-10-18" },
  { id: "after", title: "Handover", dateLabel: "From Mon 19 Oct", until: "9999-12-31" },
] as const;
export function tasksByWeek(milestones: PlanMilestone[], ownerId: string) {
  const tasks = milestones.flatMap(milestone => milestone.tasks.filter(task => task.ownerId === ownerId).map(task => ({ task, milestone })));
  tasks.sort((a, b) => (a.task.dueOn ?? "9999").localeCompare(b.task.dueOn ?? "9999") || a.milestone.sort - b.milestone.sort || a.task.sort - b.task.sort);
  let rest = tasks;
  return onsiteWeeks.map(week => {
    const inWeek = rest.filter(entry => (entry.task.dueOn ?? "9999-12-31") <= week.until);
    rest = rest.filter(entry => !inWeek.includes(entry));
    return { ...week, entries: inWeek };
  });
}
