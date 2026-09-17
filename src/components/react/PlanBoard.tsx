import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import { byDue, formatDay, nextMilestone, personName, progress, statusLabels, taskStatuses, urgency, type PlanData, type PlanMilestone, type PlanTask, type TaskStatus, type Urgency } from "../../lib/plan";
import { monoTag, outlineButton } from "../../lib/plan-ui";

// Two views of the Project Molt plan tables. Board: one swimlane per milestone
// in due order (the soonest unfinished one flagged "up next"), to do / doing /
// review / done across. Timeline: the same milestones as a list. Same data,
// same filters.
type View = "timeline" | "board";
type OwnerFilter = "all" | "none" | string;
const statusTone: Record<TaskStatus, string> = {
  todo: "border-line text-fg-muted",
  doing: "border-accent bg-accent/10 text-accent-text",
  review: "border-caution text-caution",
  done: "border-line bg-fg/5 text-fg-muted line-through decoration-fg/40",
};
const dueTone: Record<NonNullable<Urgency>, string> = { overdue: "text-alert", soon: "text-caution" };
const control = "min-h-9 rounded-none border border-line bg-canvas px-2 py-1 font-mono text-[0.68rem] text-fg focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:opacity-50";
const today = () => new Date().toISOString().slice(0, 10);

export default function PlanBoard({ initialView = "board" }: { initialView?: View }) {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [view, setView] = useState<View>(initialView);
  const [owner, setOwner] = useState<OwnerFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/plan"); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load the plan.");
      setPlan(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load the plan."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    // Remember the view in the URL so a shared link opens on the same tab.
    const url = new URL(window.location.href); url.searchParams.set("view", view); window.history.replaceState(null, "", url);
  }, [view]);

  function replaceTask(next: PlanTask) {
    setPlan(current => current && { ...current, milestones: current.milestones.map(m => m.id !== next.milestoneId ? m : { ...m, tasks: m.tasks.some(t => t.id === next.id) ? m.tasks.map(t => t.id === next.id ? next : t) : [...m.tasks, next] }) });
  }
  async function patchTask(task: PlanTask, patch: { status?: TaskStatus; ownerId?: string | null }) {
    if (!plan?.canEdit || busy.has(task.id)) return;
    setBusy(b => new Set(b).add(task.id)); setNotice(""); setError("");
    replaceTask({ ...task, ...patch });
    try {
      const response = await fetch(`/api/plan/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...patch, version: task.version }) });
      const data = await response.json();
      if (!response.ok) { if (response.status === 409) { await load(); } else replaceTask(task); throw new Error(data.error || "Could not save the change."); }
      replaceTask(data.task);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save the change."); }
    finally { setBusy(b => { const next = new Set(b); next.delete(task.id); return next; }); }
  }
  async function addTask(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget; const data = new FormData(form);
    const body = { milestoneId: String(data.get("milestone")), text: String(data.get("text")), ownerId: String(data.get("owner")) || null, dueOn: String(data.get("due")) || null };
    setError(""); setNotice("");
    try {
      const response = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not add the task.");
      replaceTask(result.task); form.reset(); setNotice("Task added.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not add the task."); }
  }

  const people = plan?.people ?? [];
  const now = today();
  const milestones = useMemo(() => byDue(plan?.milestones ?? []), [plan]);
  // Numbered by due order, so the rank on screen matches the row order.
  const rank = (milestone: PlanMilestone) => String(milestones.indexOf(milestone) + 1).padStart(2, "0");
  const next = useMemo(() => nextMilestone(plan?.milestones ?? []), [plan]);
  const matches = (task: PlanTask) => owner === "all" || (owner === "none" ? task.ownerId === null : task.ownerId === owner);
  const lanes = milestones.map(milestone => ({ milestone, tasks: milestone.tasks.filter(matches).sort((a, b) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999") || a.sort - b.sort) })).filter(lane => owner === "all" || lane.tasks.length > 0);
  const totals = progress(plan?.milestones ?? []);
  const mine = progress(milestones.map(m => ({ ...m, tasks: m.tasks.filter(matches) })));

  function onDrop(milestone: PlanMilestone, status: TaskStatus) {
    const task = milestone.tasks.find(entry => entry.id === dragging);
    setDragging(null); setDropTarget(null);
    if (task && task.status !== status) void patchTask(task, { status });
  }
  const dropKey = (milestone: PlanMilestone, status: TaskStatus) => `${milestone.id}:${status}`;

  return (
    <div className="text-fg">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-y border-line py-4">
        <div role="tablist" aria-label="View" className="flex border border-line">
          {(["board", "timeline"] as View[]).map(option => (
            <button key={option} role="tab" type="button" aria-selected={view === option} onClick={() => setView(option)}
              className={`min-h-10 px-4 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.1em] transition-colors ${view === option ? "bg-accent text-accent-fg" : "text-fg-muted hover:text-fg"}`}>
              {option === "board" ? "Board" : "Timeline"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3">
          <span className={`${monoTag} text-fg-muted`}>Owner</span>
          <select value={owner} onChange={e => setOwner(e.target.value)} className={control} aria-label="Filter by owner">
            <option value="all">Everyone</option>
            {people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
            <option value="none">Unassigned</option>
          </select>
        </label>
        {next && <p className={`${monoTag} m-0 text-fg-muted`}><span className="text-accent-text">Up next</span> {next.title} · {next.dateLabel}</p>}
        <div className="ml-auto flex items-center gap-4">
          <p className={`${monoTag} m-0 text-fg-muted`}>
            <span className="text-fg">{mine.done}</span> / {mine.total} done{owner !== "all" && <span> · {totals.done} / {totals.total} overall</span>}
          </p>
          <div className="h-1 w-32 bg-line" aria-hidden="true"><div className="h-full bg-accent transition-[width]" style={{ width: `${totals.total ? (totals.done / totals.total) * 100 : 0}%` }} /></div>
          <button type="button" onClick={() => void load()} disabled={loading} className={outlineButton}>{loading ? "Loading…" : "Reload"}</button>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 border border-danger/60 bg-danger/10 px-4 py-3 text-[0.9rem] text-fg">{error}</p>}
      {notice && !error && <p role="status" className="mt-4 border-l-2 border-accent px-4 py-2 text-[0.9rem] text-fg-muted">{notice}</p>}
      {plan && !plan.canEdit && <p className="mt-4 text-[0.85rem] text-fg-muted">You can read the plan. Changing tasks needs edit access from Andras.</p>}

      {!plan && loading && <p className="py-16 text-center font-mono text-[0.7rem] uppercase tracking-[0.1em] text-fg-muted">Loading the plan…</p>}

      {plan && view === "timeline" && (
        <ol className="m-0 mt-2 list-none p-0">
          {lanes.map(({ milestone, tasks }) => {
            const done = milestone.tasks.filter(t => t.status === "done").length;
            const current = milestone.id === next?.id;
            return (
              <li key={milestone.id} className={`grid border-b border-line md:grid-cols-[170px_minmax(0,1fr)] lg:grid-cols-[230px_minmax(0,1fr)] ${current ? "bg-accent/4" : ""}`}>
                <div className="flex flex-col items-start gap-2 border-line py-7 pr-6 md:border-r">
                  <span className={`font-brand text-[2.6rem] leading-none ${current ? "text-accent-text" : "text-fg/40"}`}>{rank(milestone)}</span>
                  <time className={`${monoTag} text-fg-muted`}>{milestone.dateLabel}</time>
                  {current && <span className={`${monoTag} bg-accent px-2 py-1 text-accent-fg`}>Up next</span>}
                  <span className={`${monoTag} text-accent-text`}>{personName(people, milestone.ownerId)}</span>
                  <span className={`${monoTag} text-fg-muted`}>{done} / {milestone.tasks.length} done</span>
                </div>
                <div className="py-7 md:pl-8">
                  <h3 className="m-0 font-display text-[clamp(1.3rem,2vw,1.7rem)] font-[650] leading-[1.1] tracking-[-0.03em] text-fg">{milestone.title}</h3>
                  <p className="mt-2 mb-0 max-w-[760px] border-l-2 border-accent pl-3 text-[0.88rem] leading-[1.5] text-fg-muted"><span className={`${monoTag} mr-2 text-accent-text`}>Done when</span>{milestone.deliverable}</p>
                  <ul className="m-0 mt-4 list-none p-0">
                    {tasks.map(task => <TaskRow key={task.id} task={task} plan={plan} now={now} busy={busy.has(task.id)} onPatch={patch => void patchTask(task, patch)} />)}
                  </ul>
                  {milestone.links.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{milestone.links.map(link => <a key={link.file} href={link.file} target="_blank" rel="noreferrer" className={outlineButton}>{link.label} ↗</a>)}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {plan && view === "board" && (
        <>
          {plan.canEdit && (
            <details className="mt-4 border border-line">
              <summary className={`cursor-pointer px-4 py-3 ${monoTag} text-accent-text`}>+ Add a task</summary>
              <form onSubmit={addTask} className="grid gap-3 border-t border-line p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_140px_140px_auto]">
                <input name="text" required minLength={3} maxLength={400} placeholder="What needs doing" className={control} aria-label="Task" />
                <select name="milestone" required className={control} aria-label="Milestone">{milestones.map(m => <option key={m.id} value={m.id}>{rank(m)} · {m.title}</option>)}</select>
                <select name="owner" className={control} aria-label="Owner"><option value="">Unassigned</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                <input name="due" type="date" className={control} aria-label="Due date" min="2026-09-16" max="2027-02-28" />
                <button type="submit" className={outlineButton}>Add</button>
              </form>
            </details>
          )}
          <div className="mt-4 hidden grid-cols-4 gap-4 md:grid" aria-hidden="true">
            {taskStatuses.map(status => <p key={status} className={`m-0 border-b-2 border-line pb-2 ${monoTag} ${status === "doing" ? "text-accent-text" : status === "review" ? "text-caution" : "text-fg"}`}>{statusLabels[status]}{status === "review" && <span className="ml-2 font-normal normal-case tracking-normal text-fg-muted">for Dori</span>}</p>)}
          </div>
          <div className="mt-2 flex flex-col gap-6">
            {lanes.map(({ milestone, tasks }) => {
              const current = milestone.id === next?.id;
              const done = milestone.tasks.filter(t => t.status === "done").length;
              return (
                <section key={milestone.id} aria-label={milestone.title} className={`border border-line ${current ? "border-accent" : ""}`}>
                  <header className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line px-4 py-3 ${current ? "bg-accent/8" : "bg-surface/60"}`}>
                    <span className={`font-brand text-[1.5rem] leading-none ${current ? "text-accent-text" : "text-fg/40"}`}>{rank(milestone)}</span>
                    <h3 className="m-0 font-display text-[1.15rem] font-[650] leading-none tracking-[-0.02em] text-fg">{milestone.title}</h3>
                    {current && <span className={`${monoTag} bg-accent px-2 py-1 text-accent-fg`}>Up next</span>}
                    <span className={`${monoTag} text-fg-muted`}>Due {milestone.dateLabel} · {personName(people, milestone.ownerId)}</span>
                    <span className={`${monoTag} ml-auto text-fg-muted`}>{done} / {milestone.tasks.length} done</span>
                  </header>
                  <div className="grid gap-px bg-line md:grid-cols-4">
                    {taskStatuses.map(status => {
                      const cards = tasks.filter(task => task.status === status);
                      const key = dropKey(milestone, status);
                      return (
                        <section key={status} aria-label={`${milestone.title} · ${statusLabels[status]}`}
                          onDragOver={e => { if (dragging && milestone.tasks.some(t => t.id === dragging)) { e.preventDefault(); setDropTarget(key); } }} onDragLeave={() => setDropTarget(current => current === key ? null : current)} onDrop={e => { e.preventDefault(); onDrop(milestone, status); }}
                          className={`flex min-h-[7rem] flex-col transition-colors ${dropTarget === key ? "bg-accent/8" : "bg-canvas"}`}>
                          <h4 className={`m-0 px-3 pt-3 ${monoTag} text-fg-muted md:sr-only`}>{statusLabels[status]} <span>{cards.length}</span></h4>
                          <ul className="m-0 flex list-none flex-col gap-2 p-3">
                            {cards.map(task => (
                              <li key={task.id} draggable={plan.canEdit && !busy.has(task.id)} onDragStart={e => { setDragging(task.id); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { setDragging(null); setDropTarget(null); }}
                                className={`border border-line bg-surface p-3 ${plan.canEdit ? "cursor-grab active:cursor-grabbing" : ""} ${dragging === task.id ? "opacity-40" : ""} ${busy.has(task.id) ? "opacity-60" : ""}`}>
                                <p className={`m-0 text-[0.88rem] leading-[1.55] ${status === "done" ? "text-fg-muted line-through decoration-fg/40" : "text-fg"}`}>{task.text}</p>
                                {status === "review" && <p className={`mt-2 mb-0 ${monoTag} text-caution`}>Waiting for Dori</p>}
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <OwnerControl task={task} plan={plan} busy={busy.has(task.id)} onChange={ownerId => void patchTask(task, { ownerId })} />
                                  <DueTag task={task} now={now} />
                                  {plan.canEdit && (
                                    <select value={task.status} disabled={busy.has(task.id)} onChange={e => void patchTask(task, { status: e.target.value as TaskStatus })} className={`${control} ml-auto`} aria-label="Status">
                                      {taskStatuses.map(option => <option key={option} value={option}>{statusLabels[option]}</option>)}
                                    </select>
                                  )}
                                </div>
                              </li>
                            ))}
                            {cards.length === 0 && <li className={`px-1 py-4 text-center ${monoTag} text-fg-muted/70`}>—</li>}
                          </ul>
                        </section>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function DueTag({ task, now }: { task: PlanTask; now: string }) {
  if (!task.dueOn) return null;
  const flag = urgency(task, now);
  return <span className={`${monoTag} ${flag ? dueTone[flag] : "text-fg-muted"}`}>{formatDay(task.dueOn)}{flag === "overdue" && " · late"}</span>;
}

function OwnerControl({ task, plan, busy, onChange }: { task: PlanTask; plan: PlanData; busy: boolean; onChange: (ownerId: string | null) => void }) {
  if (!plan.canEdit) return <span className={`${monoTag} border border-line px-2 py-1 text-fg-muted`}>{personName(plan.people, task.ownerId)}</span>;
  return (
    <select value={task.ownerId ?? ""} disabled={busy} onChange={e => onChange(e.target.value || null)} className={control} aria-label="Owner">
      <option value="">Unassigned</option>
      {plan.people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
    </select>
  );
}

function TaskRow({ task, plan, now, busy, onPatch }: { task: PlanTask; plan: PlanData; now: string; busy: boolean; onPatch: (patch: { status?: TaskStatus; ownerId?: string | null }) => void }) {
  return (
    <li className="grid gap-x-4 gap-y-2 border-t border-line py-3 first:border-t-0 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex gap-3">
        {plan.canEdit ? (
          <div role="group" aria-label="Status" className="flex h-fit flex-none border border-line">
            {taskStatuses.map(status => (
              <button key={status} type="button" disabled={busy} aria-pressed={task.status === status} onClick={() => task.status !== status && onPatch({ status })} title={statusLabels[status]}
                className={`min-h-8 min-w-8 px-2 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.06em] transition-colors disabled:opacity-50 ${task.status === status ? (status === "done" ? "bg-fg text-canvas" : status === "doing" ? "bg-accent text-accent-fg" : status === "review" ? "bg-caution text-canvas" : "bg-line text-fg") : "text-fg-muted hover:text-fg"}`}>
                {statusLabels[status]}
              </button>
            ))}
          </div>
        ) : <span className={`${monoTag} h-fit flex-none border px-2 py-1 ${statusTone[task.status]}`}>{statusLabels[task.status]}</span>}
        <p className={`m-0 text-[0.88rem] leading-[1.6] ${task.status === "done" ? "text-fg-muted line-through decoration-fg/40" : "text-fg/85"}`}>{task.text}</p>
      </div>
      <div className="flex items-center gap-2 md:justify-end">
        <DueTag task={task} now={now} />
        <OwnerControl task={task} plan={plan} busy={busy} onChange={ownerId => onPatch({ ownerId })} />
      </div>
    </li>
  );
}
