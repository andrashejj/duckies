import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { clubDayLabel, type TrainingBoard } from "../../lib/club-points";
import { input, mono, panel, primaryButton, select, smallButton } from "../../lib/comp-ui";
import { useHydrated } from "./useHydrated";

async function readResponse(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Couldn't save. Please try again.");
  return data;
}
export default function TrainingAttendance({ initial }: { initial: TrainingBoard }) {
  const ready = useHydrated();
  const [board, setBoard] = useState(initial);
  const [date, setDate] = useState(initial.date);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const generation = useRef(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const present = board.kids.filter(kid => kid.present).length;
  const available = ready && !busy && board.date === date;
  async function refresh(chosen: string) {
    const current = ++generation.current;
    try {
      const next = await readResponse(await fetch(`/api/admin/training?date=${chosen}`, { cache: "no-store" }));
      if (current === generation.current) { setBoard(next); setError(""); }
    } catch (err) { if (current === generation.current) setError(err instanceof Error ? err.message : "Couldn't load attendance."); }
  }
  useEffect(() => {
    void refresh(date);
    const timer = window.setInterval(() => { if (!saving.current && !document.hidden) void refresh(date); }, 20000);
    const focus = () => { if (!saving.current) void refresh(date); };
    window.addEventListener("focus", focus);
    return () => { generation.current++; clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [date]);
  function chooseDate(value: string) {
    if (!value || saving.current) return;
    setDate(value); setMessage(""); setError("");
    const url = new URL(location.href); url.searchParams.set("date", value); history.replaceState(null, "", url);
  }
  async function mark(kidId: string, name: string, checked: boolean) {
    const previous = board;
    saving.current = true; generation.current++; setBusy(true); setError(""); setMessage("");
    setBoard(current => ({ ...current, kids: current.kids.map(kid => kid.id === kidId ? { ...kid, present: checked } : kid) }));
    try {
      const next = await readResponse(await fetch("/api/admin/training", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, kidId, present: checked }) }));
      setBoard(next); setMessage(checked ? `${name} checked in. ${next.sessionPoints} points recorded.` : `${name} unchecked. Training points removed.`);
    } catch (err) { setBoard(previous); setError(err instanceof Error ? err.message : "Couldn't save attendance. Try again."); }
    finally { saving.current = false; setBusy(false); }
  }
  async function saveRules(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    saving.current = true; generation.current++; setBusy(true); setError(""); setMessage("");
    try {
      await readResponse(await fetch("/api/admin/point-rules", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(["training", "granola", "cup"].map(key => [key, Number(form.get(key))]))) }));
      await refresh(date); setMessage("Point values saved for new activities. Existing points stay unchanged.");
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't save point values."); }
    finally { saving.current = false; setBusy(false); }
  }
  const visible = board.kids.filter(kid => `${kid.name} ${kid.guardians}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (filter === "all" || (filter === "present" ? kid.present : !kid.present)));
  const ranked = [...board.kids].sort((a, b) => b.points.total - a.points.total || a.name.localeCompare(b.name));
  return <>
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div><p className={mono}>The training roll · Tamarin Bay</p><h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">Who’s in the <span className="font-accent italic">water?</span></h1>
        <p className="mt-4 max-w-xl text-fg-muted">Check each duckie as they arrive. Every check saves straight away; uncheck to correct a mistake.</p></div>
      <a href="#club-points" className={smallButton}>Club points ↓</a>
    </div>
    <section aria-label="Training attendance" className={`${panel} mt-8`}>
      <div className="flex flex-wrap items-end justify-between gap-5 border-b-2 border-edge pb-5">
        <div><p className={mono}>Training date · Mauritius time</p><h2 className="mt-2 font-display text-2xl font-bold">{clubDayLabel(date)}</h2>
          <p className="mt-2 text-sm">{board.date === date ? `${board.sessionPoints} points per duckie · one check-in per day` : "Loading this training…"}</p></div>
        <div className="flex flex-wrap items-end gap-3"><label className="grid gap-1"><span className={mono}>Choose date</span><input aria-label="Training date" className={input} type="date" value={date} max={board.today} disabled={!ready || busy} onChange={event => chooseDate(event.target.value)} /></label><button type="button" className={smallButton} disabled={!ready || busy} onClick={() => chooseDate(board.today)}>Today</button></div>
      </div>
      {!board.canEdit && <p className="mt-4 rounded-xl border border-line p-3 text-sm">Only andras@hejj.xyz can record attendance or change point values. You can view the roll and totals.</p>}
      <div className="mt-5 grid grid-cols-2 items-end gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <p className="justify-self-start rounded-full border-2 border-edge bg-sticker-sun px-4 py-2 font-display text-lg font-bold" data-attendance-count>{board.date === date ? `${present} / ${board.kids.length} here` : "Loading…"}</p>
        <label className="col-span-2 grid min-w-0 gap-1 sm:col-span-1"><span className={mono}>Find a duckie</span><input type="search" className={input} placeholder="Name or parent…" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <label className="col-start-2 row-start-1 grid gap-1 sm:col-auto sm:row-auto"><span className={mono}>Show</span><select className={select} value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All duckies</option><option value="present">Here</option><option value="missing">Not checked in</option></select></label>
      </div>
      <p className="mt-3 min-h-6 text-sm font-semibold" role="status" aria-live="polite">{busy ? "Saving…" : message}</p>
      {error && <div role="alert" className="my-3 rounded-xl border-2 border-alert p-3 text-alert">{error} <button type="button" className="underline" onClick={() => void refresh(date)}>Reload attendance</button></div>}
      <ul className="mt-2 divide-y-2 divide-line">{visible.map(kid => <li key={kid.id}>
        <label className={`flex min-h-24 cursor-pointer items-center gap-3 rounded-xl px-2 py-4 sm:gap-4 ${kid.present ? "bg-teal-500/15" : ""}`}>
          <input aria-label={`Present: ${kid.name}`} type="checkbox" className="h-8 w-8 shrink-0 accent-teal-500" checked={kid.present} disabled={!available || !board.canEdit || date > board.today} onChange={event => void mark(kid.id, kid.name, event.target.checked)} />
          {kid.photoVersion ? <img className="h-12 w-12 shrink-0 rounded-full border border-edge object-cover sm:h-14 sm:w-14" src={`/api/kids/${kid.id}/photo?v=${encodeURIComponent(kid.photoVersion)}`} alt="" /> : <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-edge bg-sticker-sun font-display text-2xl">{kid.name.slice(0, 1)}</span>}
          <span className="min-w-0 flex-1"><span className="block font-display text-lg font-bold sm:text-xl">{kid.name}</span><span className="block break-words text-sm text-fg-muted">{kid.guardians || "Guardian details not linked yet"}</span><span className="mt-1 block font-mono text-xs">{kid.points.total} club points</span></span>
          <span className="hidden shrink-0 font-bold sm:block">{kid.present ? `✓ Here · +${board.sessionPoints}` : "Check in"}</span>
        </label>
      </li>)}</ul>
      {visible.length === 0 && <p className="py-6 text-fg-muted">{board.kids.length ? "No duckies match this filter." : "Add duckies to the club roster to take attendance."}</p>}
      {board.sessions.length > 0 && <details className="mt-5 border-t border-line pt-4"><summary className="cursor-pointer font-bold">Recent trainings</summary><ul className="mt-3 flex flex-wrap gap-2">{board.sessions.map(session => <li key={session.date}><button type="button" className={smallButton} disabled={!ready || busy} onClick={() => chooseDate(session.date)}>{clubDayLabel(session.date)} · {session.present} here</button></li>)}</ul></details>}
    </section>
    <section id="club-points" aria-label="Club points" className={`${panel} mt-8 scroll-mt-6`}>
      <p className={mono}>All-time totals · refreshes every 20 seconds</p><h2 className="mt-2 font-display text-3xl font-bold">Club points</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-fg-muted">Training earns points for every attended session. Paid granola earns points for each child selected on the order. Cup participation counts once per edition, after a scored run. These are club points; Cup judging scores stay separate.</p>
      <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">All-time club points by duckie</caption><thead className="border-b-2 border-edge font-mono text-xs"><tr><th className="px-1.5 py-3 sm:p-3">Duckie</th><th className="px-1.5 py-3 sm:p-3">Training</th><th className="px-1.5 py-3 sm:p-3">Granola</th><th className="px-1.5 py-3 sm:p-3">Cup</th><th className="px-1.5 py-3 sm:p-3">Total</th></tr></thead><tbody>{ranked.map(kid => <tr key={kid.id} className="border-b border-line"><th className="px-1.5 py-3 font-display text-base sm:p-3">{kid.name}</th><td className="px-1.5 py-3 sm:p-3">{kid.points.training}</td><td className="px-1.5 py-3 sm:p-3">{kid.points.granola}</td><td className="px-1.5 py-3 sm:p-3">{kid.points.cup}</td><td className="px-1.5 py-3 font-bold sm:p-3">{kid.points.total}</td></tr>)}</tbody></table></div>
      <details className="mt-6 border-t border-line pt-4"><summary className="cursor-pointer font-bold">Point values</summary>
        <p className="mt-3 text-sm leading-6 text-fg-muted">Changes apply to new trainings, orders paid afterwards and a child’s first scored run in a new Cup edition. Existing trainings and earned points keep their values. Set a value to 0 to stop awarding points for that activity.</p>
        <form key={JSON.stringify(board.rules)} onSubmit={event => void saveRules(event)}><fieldset disabled={!available || !board.canEdit} className="mt-4 grid gap-4 sm:grid-cols-3">
          {([["training", "Training attended"], ["granola", "Per paid granola bag"], ["cup", "Cup participation"]] as const).map(([key, label]) => <label key={key} className="grid gap-1"><span className={mono}>{label}</span><input className={input} type="number" name={key} min="0" max="1000" step="1" required defaultValue={board.rules[key]} /></label>)}
          <button type="submit" className={`${primaryButton} justify-self-start sm:col-span-3`}>Save point values</button>
        </fieldset></form>
      </details>
    </section>
  </>;
}
