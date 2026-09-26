import { useState, type SubmitEvent } from "react";
import type { Coach, PointRules } from "../../lib/club-points";
import { cn } from "../../lib/cn";
import { card, cardLead, cardTitle, eyebrow, muted, select } from "../../lib/cup-members-ui";
import { button, field, fieldLabel, primaryButton, textButton } from "../../lib/training-ui";
import { useHydrated } from "./useHydrated";

// Organisers' part of the club training page: who can call the roll, and
// what each activity is worth.
type Person = { email: string; name: string };
type Section = "coaches" | "values";
export type OrganiserTools = { rules: PointRules; canEditRules: boolean; coaches: Coach[]; people: Person[] };
async function send<T>(url: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(url, { method, cache: "no-store", headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Couldn't save. Please try again.");
  return data;
}

export default function TrainingOrganiser({ rules: initialRules, canEditRules, coaches: initialCoaches, people, onRulesSaved }: OrganiserTools & { onRulesSaved: () => void }) {
  const ready = useHydrated();
  const [coaches, setCoaches] = useState(initialCoaches);
  const [rules, setRules] = useState(initialRules);
  const [busy, setBusy] = useState(false);
  // Feedback shows beside the card that asked for it.
  const [note, setNote] = useState<{ at: Section; text: string; failed?: boolean } | null>(null);
  const candidates = people.filter(person => !coaches.some(coach => coach.email === person.email));

  async function run(at: Section, action: () => Promise<string>) {
    setBusy(true); setNote(null);
    try { setNote({ at, text: await action() }); }
    catch (err) { setNote({ at, text: err instanceof Error ? err.message : "Couldn't save. Please try again.", failed: true }); }
    finally { setBusy(false); }
  }
  const feedback = (at: Section) => <>
    <p className="mt-3 min-h-5 text-[13px] font-semibold" role="status" aria-live="polite">{note?.at === at && !note.failed ? note.text : ""}</p>
    {note?.at === at && note.failed && <p role="alert" className="rounded-lg border border-coral-500/50 bg-coral-500/[0.06] px-3 py-2 text-[13px]">{note.text}</p>}
  </>;
  function addCoach(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget, data = Object.fromEntries(new FormData(form)) as { email: string; name?: string };
    void run("coaches", async () => {
      const { coaches } = await send<{ coaches: Coach[] }>("/api/admin/coaches", "POST", data.name === undefined ? { email: data.email } : data);
      setCoaches(coaches); form.reset();
      return `${coaches.find(coach => coach.email === data.email.trim().toLowerCase())?.name ?? "The coach"} can now call the roll.`;
    });
  }
  function removeCoach(coach: Coach) {
    void run("coaches", async () => {
      setCoaches((await send<{ coaches: Coach[] }>(`/api/admin/coaches/${encodeURIComponent(coach.email)}`, "DELETE")).coaches);
      return `${coach.name} can no longer call the roll. The attendance they recorded stays.`;
    });
  }
  function copyLink() {
    void run("coaches", async () => {
      await navigator.clipboard.writeText(new URL("/members/training", location.origin).href);
      return "Link copied. Coaches sign in with the email you added.";
    });
  }
  function saveRules(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = Object.fromEntries(["training", "sunrise", "granola", "cup"].map(key => [key, Number(form.get(key))])) as PointRules;
    void run("values", async () => {
      await send("/api/admin/point-rules", "PUT", next);
      setRules(next); onRulesSaved();
      return "Saved. New trainings, orders and Cup runs use these values; earned points stay as they are.";
    });
  }

  return <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
    <section className={card} aria-labelledby="training-coaches">
      <div className={cardLead}>
        <h2 id="training-coaches" className={cardTitle}>Coaches & trainers</h2>
        <button type="button" className={cn(textButton, "-mr-2 min-h-8")} disabled={!ready || busy} onClick={copyLink}>Copy link for coaches</button>
      </div>
      <p className={cn(muted, "mt-1")}>They call the roll on this page. Organisers always can.</p>
      {feedback("coaches")}
      {coaches.length ? <ul className="divide-y divide-line border-y border-line">{coaches.map(coach => <li key={coach.email} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">{coach.name}</p>
          <p className="text-[12px] break-all text-fg-muted">{coach.email} · {coach.signedIn ? "has signed in" : "not signed in yet"}</p>
        </div>
        <button type="button" className={textButton} aria-label={`Remove ${coach.name}`} disabled={!ready || busy} onClick={() => removeCoach(coach)}>Remove</button>
      </li>)}</ul> : <p className={muted}>No coaches yet.</p>}
      <form onSubmit={addCoach} className="mt-4 flex flex-wrap items-end gap-2.5">
        <label className={cn(fieldLabel, "flex-[1_1_15rem]")}>Parent or volunteer
          <select name="email" required defaultValue="" className={cn(select, "w-full text-base sm:text-[14px]")} disabled={!ready || busy}>
            <option value="" disabled>Choose someone…</option>
            {candidates.map(person => <option key={person.email} value={person.email}>{person.name} · {person.email}</option>)}
          </select>
        </label>
        <button type="submit" className={primaryButton} disabled={!ready || busy}>Add coach</button>
      </form>
      <details className="mt-4 border-t border-line pt-3"><summary className="min-h-8 cursor-pointer text-[13px] font-semibold">Someone from outside the club?</summary>
        <form onSubmit={addCoach} className="mt-3 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className={fieldLabel}>Email<input name="email" type="email" required maxLength={254} autoComplete="off" className={field} disabled={!ready || busy} /></label>
          <label className={fieldLabel}>Name<input name="name" required maxLength={120} autoComplete="off" className={field} disabled={!ready || busy} /></label>
          <button type="submit" className={cn(button, "min-h-11")} disabled={!ready || busy}>Add trainer</button>
        </form>
      </details>
    </section>

    <section className={card} aria-labelledby="training-values">
      <div className={cardLead}><h2 id="training-values" className={cardTitle}>Point values</h2><p className={eyebrow}>{canEditRules ? "new activities only" : "set by andras@hejj.xyz"}</p></div>
      <form key={JSON.stringify(rules)} onSubmit={saveRules}><fieldset disabled={!ready || busy || !canEditRules} className="mt-3 grid gap-3">
        {([["training", "Sunset Duckies attended"], ["sunrise", "Sunrise Duckies attended"], ["granola", "Per granola bag reserved"], ["cup", "Cup participation"]] as const).map(([key, label]) =>
          <label key={key} className={cn(fieldLabel, "grid-cols-[minmax(0,1fr)_6rem] items-center")}>{label}<input className={cn(field, "text-right tabular-nums")} type="number" name={key} min="0" max="1000" step="1" required defaultValue={rules[key]} /></label>)}
        {canEditRules && <button type="submit" className={cn(primaryButton, "justify-self-start")}>Save point values</button>}
      </fieldset></form>
      {feedback("values")}
    </section>
  </div>;
}
