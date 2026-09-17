import { byDue, formatDay, nextMilestone, personName, tasksByWeek, urgency, type PlanData, type PlanTask, type TaskStatus, type Urgency } from "./plan";

// Shapes the plan for the server-rendered timelines (plan, onsite, overview),
// so every page reads the same rows the board edits.
export type StepTask = { text: string; status?: TaskStatus; owner?: string; due?: string; urgency?: Urgency };
export type Step = {
  date: string; title: string; deliverable?: string; tasks: (string | StepTask)[];
  links?: { label: string; file: string }[]; status?: "now"; owner?: string;
};
type Plan = Omit<PlanData, "canEdit">;

export const todayIso = () => new Date().toISOString().slice(0, 10);

export function taskRow(task: PlanTask, plan: Plan, today: string): StepTask {
  return { text: task.text, status: task.status, owner: personName(plan.people, task.ownerId), due: formatDay(task.dueOn) || undefined, urgency: urgency(task, today) };
}

/** The seven milestones in due order, the soonest unfinished one flagged. */
export function milestoneSteps(plan: Plan, today: string) {
  const next = nextMilestone(plan.milestones);
  const milestones = byDue(plan.milestones);
  return {
    codes: milestones.map((_, index) => String(index + 1).padStart(2, "0")),
    steps: milestones.map((milestone): Step => ({
      date: milestone.dateLabel, title: milestone.title, deliverable: milestone.deliverable, links: milestone.links,
      owner: personName(plan.people, milestone.ownerId), status: milestone.id === next?.id ? "now" : undefined,
      tasks: [...milestone.tasks].sort((a, b) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999") || a.sort - b.sort).map(task => taskRow(task, plan, today)),
    })),
  };
}

/** One person's tasks bucketed into the onsite weeks; the current week is flagged. */
export function weekSteps(plan: Plan, ownerId: string, today: string) {
  const weeks = tasksByWeek(plan.milestones, ownerId);
  const currentWeek = weeks.find(week => today <= week.until)?.id;
  return {
    codes: ["E00", "E01", "E02", "E03", "E04"],
    steps: weeks.map((week): Step => ({
      date: week.dateLabel, title: week.title, status: week.id === currentWeek ? "now" : undefined,
      tasks: week.entries.map(({ task, milestone }) => ({ ...taskRow(task, plan, today), owner: milestone.title })),
    })),
  };
}

/** A person's open tasks, soonest first. */
export function openTasks(plan: Plan, ownerId: string, today: string, limit = 6) {
  return plan.milestones
    .flatMap(milestone => milestone.tasks.filter(task => task.ownerId === ownerId && task.status !== "done").map(task => ({ task, milestone })))
    .sort((a, b) => (a.task.dueOn ?? "9999").localeCompare(b.task.dueOn ?? "9999") || a.milestone.sort - b.milestone.sort || a.task.sort - b.task.sort)
    .slice(0, limit)
    .map(({ task, milestone }) => ({ ...taskRow(task, plan, today), milestone: milestone.title }));
}

