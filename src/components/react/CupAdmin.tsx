import { useEffect, useMemo, useRef, useState, type SubmitEvent } from "react";
import {
  heatSecondsLeft, formatScore, heatLabel, heatResults, heatShort, rashieLabel, RASHIES,
  type CupConfig, type Entrant, type Heat, type HeatStatus, type Rashie,
} from "../../lib/comp";
import type { CompState } from "../../lib/server/comp";
import {
  avatar, avatarEmpty, dangerButton, errorNotice, heatCard, input, linkButton, mono, monoPlain, notice as noticeClass, panel, panelTitle, pill,
  primaryButton, rashieSwatch, select, slotRow, smallButton, statusPill,
} from "../../lib/comp-ui";
import { ParentPhoto, ParentPhotoUpload } from "./ParentProfileEditor";
import { HeatCountdown, HeatWarnings, useCompetitionClock } from "./CupClock";
import { Leaderboard } from "./CupLeaderboard";

// The organiser's cup board: draw the rounds, move kids between heats, run the
// heats, invite judges, watch the leaderboard and feed the public ticker. One
// GET builds the whole picture; every write returns it again.
type RoundKey = number | "final";
const api = async (url: string, method = "GET", body?: unknown) => {
  const response = await fetch(url, { method, cache: "no-store", headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error ?? "Couldn't save this change."), { status: response.status });
  return data;
};
export default function CupAdmin({ liveHref, judgeHref }: { liveHref: string; judgeHref: string }) {
  const [state, setState] = useState<CompState | null>(null);
  const [round, setRound] = useState<RoundKey>(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const now = useCompetitionClock(state?.serverNow);

  const generation = useRef(0);
  const loading = useRef(false);
  async function load() {
    if (loading.current) return;
    loading.current = true;
    const version = ++generation.current;
    try { const next = await api("/api/admin/cup"); if (version !== generation.current) return; setState(next); setError(""); }
    catch (e) { if (version === generation.current) setError(e instanceof Error ? e.message : "Couldn't load the board."); }
    finally { loading.current = false; }
  }
  useEffect(() => { void load(); }, []);
  // Running heats show a clock; scores from the judges' phones arrive every 3 s.
  useEffect(() => {
    const poll = window.setInterval(() => { if (!busy && !dragging) void load(); }, 3000);
    return () => { window.clearInterval(poll); };
  }, [busy, dragging]);

  // Every write returns the whole board (or a slice of it); 409s mean somebody else moved first.
  async function act(work: () => Promise<Partial<CompState> | void>, done?: string) {
    if (busy) return;
    generation.current++;
    setBusy(true); setError(""); setNotice("");
    try {
      const next = await work();
      if (next && "config" in next && "heats" in next) setState(next as CompState);
      else if (next) setState((current) => current && { ...current, ...next });
      if (done) setNotice(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this change.");
      if ((e as { status?: number }).status === 409) await load();
    } finally { setBusy(false); }
  }
  const saveConfig = (patch: Partial<Pick<CupConfig, "rounds" | "heatSize" | "finalSize" | "live">>, done?: string) =>
    act(async () => ({ config: (await api("/api/admin/cup", "PATCH", { ...patch, version: state!.config.version })).config }), done);
  const draw = (target: RoundKey) => act(() => target === "final" ? api("/api/admin/cup/final", "POST", {}) : api("/api/admin/cup/rounds", "POST", { round: target }), target === "final" ? "The final is set." : `Round ${target} drawn.`);
  const deleteRound = (target: RoundKey) => {
    if (!window.confirm(`Delete the heats of ${target === "final" ? "the final" : `round ${target}`}?`)) return;
    void act(() => api(`/api/admin/cup/rounds/${target}`, "DELETE"), "Heats deleted.");
  };
  const move = (kidId: string, target: RoundKey, heatId: string | null, colour?: Rashie) =>
    act(() => api("/api/admin/cup/slots", "POST", { kidId, stage: target === "final" ? "final" : "round", round: target === "final" ? 0 : target, heatId, colour }));
  const setStatus = (heat: Heat, status: HeatStatus) => act(() => api(`/api/admin/cup/heats/${heat.id}`, "PATCH", { status }), status === "running" ? `${heatLabel(heat)} is in the water.` : status === "done" ? `${heatLabel(heat)} posted to the ticker.` : undefined);

  const config = state?.config;
  const kids = useMemo(() => new Map((state?.entrants ?? []).map((kid) => [kid.id, kid])), [state]);
  const roundHeats = useMemo(() => (state?.heats ?? []).filter((heat) => round === "final" ? heat.stage === "final" : heat.stage === "round" && heat.round === round), [state, round]);
  const placed = new Set(roundHeats.flatMap((heat) => heat.slots.map((slot) => slot.kidId)));
  const spare = (state?.entrants ?? []).filter((kid) => !placed.has(kid.id));
  const scored = roundHeats.some((heat) => state!.waves.some((wave) => wave.heatId === heat.id));
  const rounds: RoundKey[] = config ? [...Array.from({ length: config.rounds }, (_, i) => i + 1), "final"] : [];

  if (!state || !config) return <p className={error ? errorNotice : `${mono} py-6`}>{error || "Loading the board…"}</p>;
  const ages = state.entrants.filter((kid) => kid.age !== null).map((kid) => kid.age!);
  return (
    <div className="mt-8 grid gap-8 text-fg">
      <HeatWarnings heats={state.heats} now={now} />
      {(error || notice) && <p role="status" className={error ? errorNotice : noticeClass}>{error || notice}</p>}

      {/* Settings + live switch */}
      <section className={`${panel} grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start`}>
        <div className="grid gap-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h2 className={panelTitle}>{state.entrants.length} kids in the draw</h2>
            <p className={mono}>{ages.length ? `ages ${Math.min(...ages)}–${Math.max(...ages)}` : "no ages yet"} · {state.entrants.filter((kid) => !kid.member).length} cup-only · {state.entrants.filter((kid) => kid.age === null).length} without a signed form</p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            {([["rounds", "Rounds", [1, 2, 3, 4, 5, 6]], ["heatSize", "Kids per heat", [2, 3, 4]], ["finalSize", "In the final", [2, 3, 4]]] as const).map(([key, label, options]) => (
              <label key={key} className="grid gap-1">
                <span className={mono}>{label}</span>
                <select className={select} value={config[key]} disabled={busy} onChange={(event) => void saveConfig({ [key]: Number(event.target.value) }, "Settings saved.")}>
                  {options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            ))}
            <p className="max-w-md text-sm text-fg-muted">Round 1 goes by age, youngest together. Every later round is shuffled, keeping kids who already surfed together apart. Everyone surfs once per round; the final takes the top of the leaderboard.</p>
          </div>
        </div>
        <div className="grid gap-3 rounded-card border-2 border-edge bg-canvas p-4">
          <button type="button" disabled={busy} onClick={() => void saveConfig({ live: !config.live }, config.live ? "The public leaderboard is hidden again." : "The leaderboard is live.")}
            className={`${config.live ? primaryButton : smallButton} min-h-11 px-5 text-[0.95rem]`} aria-pressed={config.live}>
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${config.live ? "bg-ink-950 motion-safe:animate-pulse" : "bg-fg/40"}`} />
            {config.live ? "Leaderboard is LIVE" : "Leaderboard is hidden"}
          </button>
          <p className="max-w-[16rem] text-sm text-fg-muted">The public page shows first names as they are on the roster, ages and scores — no photos, no contacts.</p>
          <div className="flex flex-wrap gap-3">
            <a className={linkButton} href={liveHref} target="_blank" rel="noreferrer">Live page ↗</a>
            <a className={linkButton} href={judgeHref} target="_blank" rel="noreferrer">Judge sheet ↗</a>
          </div>
        </div>
      </section>

      {/* Rounds */}
      <section className="grid gap-4">
        <div role="tablist" aria-label="Rounds" className="flex flex-wrap gap-2">
          {rounds.map((key) => {
            const count = state.heats.filter((heat) => key === "final" ? heat.stage === "final" : heat.stage === "round" && heat.round === key).length;
            return (
              <button key={key} role="tab" type="button" aria-selected={round === key} onClick={() => setRound(key)}
                className={`${smallButton} min-h-10 px-4 aria-selected:bg-accent aria-selected:text-accent-fg`}>
                {key === "final" ? "The Final" : `Round ${key}`}
                <span className="font-mono text-[0.6rem] opacity-70">{count ? `${count} heat${count === 1 ? "" : "s"}` : "not drawn"}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {round === "final" ? (
            <button type="button" className={primaryButton} disabled={busy || scored} onClick={() => void draw("final")}>{roundHeats.length ? "Rebuild the final from the leaderboard" : `Build the final (top ${config.finalSize})`}</button>
          ) : (
            <button type="button" className={primaryButton} disabled={busy || scored || !state.entrants.length} onClick={() => void draw(round)}>{roundHeats.length ? `Redraw round ${round}` : `Draw round ${round}`}</button>
          )}
          {roundHeats.length > 0 && <button type="button" className={dangerButton} disabled={busy || scored} onClick={() => deleteRound(round)}>Delete these heats</button>}
          {scored && <p className={mono}>Judges have scored this round — move kids by hand, no redraw.</p>}
          {!roundHeats.length && round !== "final" && round > 1 && !state.heats.some((heat) => heat.stage === "round" && heat.round === round - 1) && <p className={mono}>Draw round {round - 1} first so the shuffle can avoid repeats.</p>}
        </div>

        {roundHeats.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roundHeats.map((heat) => {
              const results = heatResults(heat, state.waves);
              const capacity = round === "final" ? config.finalSize : config.heatSize;
              return (
                <article key={heat.id} className={heatCard} data-drop={dropTarget === heat.id}
                  onDragOver={(event) => { if (dragging) { event.preventDefault(); setDropTarget(heat.id); } }}
                  onDragLeave={() => setDropTarget((current) => current === heat.id ? null : current)}
                  onDrop={(event) => { event.preventDefault(); const kidId = dragging; setDragging(null); setDropTarget(null); if (kidId && !heat.slots.some((slot) => slot.kidId === kidId)) void move(kidId, round, heat.id); }}>
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-lg font-bold [font-variation-settings:'wdth'_110]">{heatLabel(heat)}</h3>
                      <p className={mono}>{heat.slots.length}/{capacity} · {heat.status === "running" ? "in the water" : heat.status === "done" ? "done" : "scheduled"}</p>
                    </div>
                    <span className={`${pill} ${statusPill[heat.status]}`}>{heat.status === "running" ? "● live" : heat.status}</span>
                  </header>
                  {heat.status === "running" && <HeatCountdown heat={heat} now={now} />}
                  {heat.status === "scheduled" && <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
                    event.preventDefault(); const durationMinutes = Number(new FormData(event.currentTarget).get("minutes"));
                    void act(() => api(`/api/admin/cup/heats/${heat.id}`, "PATCH", { durationMinutes }), "Heat duration saved.");
                  }}>
                    <label className="grid gap-1"><span className={mono}>Heat minutes</span><input key={heat.durationMinutes} name="minutes" aria-label={`Minutes for ${heatLabel(heat)}`} type="number" min={1} max={60} required defaultValue={heat.durationMinutes} className={`${input} max-w-20`} disabled={busy} /></label>
                    <button className={smallButton} type="submit" disabled={busy}>Set duration</button>
                  </form>}
                  <ul className="grid min-w-0 grid-cols-1 gap-2">
                    {heat.slots.map((slot) => {
                      const kid = kids.get(slot.kidId);
                      const result = results.get(slot.kidId);
                      return (
                        <li key={slot.kidId} className={slotRow} draggable={!busy} data-dragging={dragging === slot.kidId}
                          onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDragging(slot.kidId); }} onDragEnd={() => { setDragging(null); setDropTarget(null); }}>
                          {/* The swatch is the colour itself with its initial; the select sits invisibly on top so the menu still lists the rashies. */}
                          <span className="relative shrink-0">
                            <span className={rashieSwatch(slot.colour, "h-8 w-8")} aria-hidden="true">{rashieLabel[slot.colour].slice(0, 1)}</span>
                            <select aria-label={`${kid?.name ?? "Kid"}'s rashie`} title="Change rashie" className="absolute inset-0 cursor-pointer opacity-0" value={slot.colour} disabled={busy}
                              onChange={(event) => void move(slot.kidId, round, heat.id, event.target.value as Rashie)}>
                              {RASHIES.map((colour) => <option key={colour} value={colour} disabled={heat.slots.some((other) => other.kidId !== slot.kidId && other.colour === colour)}>{rashieLabel[colour]}</option>)}
                            </select>
                          </span>
                          <Avatar kid={kid} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-[0.98rem] font-bold [font-variation-settings:'wdth'_108]">{kid?.name ?? "Unknown"}</p>
                            <p className={`${mono} truncate`}>{kid?.age ?? "?"} yrs · {result?.score === null || result === undefined ? `${result?.waves ?? 0} waves` : `${formatScore(result.score)} ★ · ${result.waves} waves`}</p>
                          </div>
                          <select aria-label={`Move ${kid?.name ?? "kid"}`} className={`${select} max-w-[6.5rem] py-1 text-xs`} value={heat.id} disabled={busy}
                            onChange={(event) => void move(slot.kidId, round, event.target.value === "out" ? null : event.target.value)}>
                            {roundHeats.map((other) => <option key={other.id} value={other.id}>{other.id === heat.id ? "Here" : `→ ${heatShort(other)}`}</option>)}
                            <option value="out">Take out</option>
                          </select>
                        </li>
                      );
                    })}
                    {heat.slots.length === 0 && <li className={`${mono} py-2`}>Empty — drop a kid here.</li>}
                  </ul>
                  {state.volunteers.some((request) => request.heatId === heat.id) && <div className="grid gap-2 border-t border-line pt-3">
                    <h4 className={mono}>Volunteers for this heat</h4>
                    {state.volunteers.filter((request) => request.heatId === heat.id).map((request) => {
                      const parent = state.parents.find((parent) => parent.email === request.email);
                      const open = heat.status === "scheduled" || heatSecondsLeft(heat, now) > 0;
                      return <div key={request.email} className="grid gap-2 rounded-xl border border-line p-3">
                        <div className="flex min-w-0 items-center gap-2">{parent && <ParentPhoto profile={parent} className="h-12 w-12" />}<div className="min-w-0"><p className="font-bold">{parent?.name || request.email}</p><p className="break-all text-xs">{request.email}</p></div></div>
                        {parent?.phone && <p className="text-sm">{parent.phone}</p>}
                        {!!parent?.children.length && <p className="text-sm">Parent of {parent.children.map((kid) => kid.name).join(", ")}</p>}
                        <p className={mono}>{request.status}</p>
                        {open && <div className="flex flex-wrap gap-2">
                          {request.status !== "approved" && <button type="button" className={primaryButton} disabled={busy} onClick={() => void act(() => api(`/api/admin/cup/heats/${heat.id}/volunteers`, "PATCH", { email: request.email, decision: "approved" }), "Volunteer approved for this heat.")}>Approve {parent?.name || "volunteer"}</button>}
                          {request.status !== "declined" && <button type="button" className={smallButton} disabled={busy} onClick={() => void act(() => api(`/api/admin/cup/heats/${heat.id}/volunteers`, "PATCH", { email: request.email, decision: "declined" }), "Volunteer selection updated.")}>{request.status === "approved" ? "Remove approval" : "Decline"}</button>}
                        </div>}
                      </div>;
                    })}
                  </div>}
                  <fieldset className="grid gap-2 border-t border-line pt-3" disabled={busy || heat.status === "done" || (heat.status === "running" && !heatSecondsLeft(heat, now))}>
                    <legend className={mono}>Judges for this heat</legend>
                    {state.judges.map((judge) => <label key={judge.email} className="flex min-h-11 items-center gap-2 text-sm">
                      <input type="checkbox" checked={heat.judges.includes(judge.email)} onChange={(event) => {
                        const judges = event.target.checked ? [...heat.judges, judge.email] : heat.judges.filter((email) => email !== judge.email);
                        void act(() => api(`/api/admin/cup/heats/${heat.id}/judges`, "PUT", { judges }), "Heat judges saved.");
                      }} />{judge.name}
                    </label>)}
                    {!heat.judges.length && <p className="text-sm text-fg-muted">Nobody can score this heat until you select a judge.</p>}
                  </fieldset>
                  <footer className="mt-auto flex flex-wrap gap-2">
                    {heat.status === "scheduled" && <button type="button" className={primaryButton} disabled={busy} onClick={() => void setStatus(heat, "running")}>Start heat</button>}
                    {heat.status === "running" && <button type="button" className={primaryButton} disabled={busy} onClick={() => void setStatus(heat, "done")}>Finish + post result</button>}
                    {heat.status !== "scheduled" && !state.waves.some((wave) => wave.heatId === heat.id) && <button type="button" className={smallButton} disabled={busy} onClick={() => void setStatus(heat, "scheduled")}>Reset</button>}
                  </footer>
                </article>
              );
            })}
          </div>
        )}

        {roundHeats.length > 0 && spare.length > 0 && (
          <div className={`${panel} grid gap-3`}>
            <h3 className={panelTitle}>Not in {round === "final" ? "the final" : `round ${round}`} <span className={mono}>{spare.length}</span></h3>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {spare.map((kid) => (
                <li key={kid.id} className={slotRow} draggable={!busy} data-dragging={dragging === kid.id}
                  onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; setDragging(kid.id); }} onDragEnd={() => { setDragging(null); setDropTarget(null); }}>
                  <Avatar kid={kid} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[0.98rem] font-bold [font-variation-settings:'wdth'_108]">{kid.name}</p>
                    <p className={mono}>{kid.age ?? "?"} yrs{kid.member ? "" : " · cup-only"}</p>
                  </div>
                  <select aria-label={`Add ${kid.name} to a heat`} className={`${select} max-w-[8rem] py-1 text-xs`} value="" disabled={busy} onChange={(event) => { if (event.target.value) void move(kid.id, round, event.target.value); }}>
                    <option value="">Add to…</option>
                    {roundHeats.map((heat) => <option key={heat.id} value={heat.id}>{heatShort(heat)}</option>)}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className={`${panel} grid gap-4`}>
        <h2 className={panelTitle}>Parents &amp; volunteers <span className={mono}>{state.parents.length}</span></h2>
        <p className="text-sm text-fg-muted">Contact details from the latest signed registrations, with each adult’s own profile and photo. Only organisers can see this directory.</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {state.parents.map((parent) => <article key={parent.email} aria-label={`Parent profile: ${parent.name || parent.email}`} className="grid min-w-0 content-start gap-3 rounded-xl border border-line p-4">
            <div className="flex items-center gap-3"><ParentPhoto profile={parent} /><div className="min-w-0"><h3 className="font-display text-lg font-bold">{parent.name || "Name not saved"}</h3><p className="break-all text-xs">{parent.email}</p></div></div>
            {parent.phone && <p className="text-sm">{parent.phone}</p>}
            {!!parent.children.length && <p className="text-sm">Parent of {parent.children.map((kid) => kid.name).join(", ")}</p>}
            <ParentPhotoUpload profile={parent} onSaved={() => void load()} />
          </article>)}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Leaderboard */}
        <section className={`${panel} overflow-x-auto`}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className={panelTitle}>Leaderboard</h2>
            <p className={mono}>best 2 runs averaged · 5 stars maximum · final separate</p>
          </div>
          <Leaderboard rows={state.standings} rounds={config.rounds} />
        </section>

        <div className="grid content-start gap-8">
          {/* Judges */}
          <section className={`${panel} grid gap-4`}>
            <h2 className={panelTitle}>Judges <span className={mono}>{state.judges.length}</span></h2>
            <p className="text-sm text-fg-muted">Parents can volunteer from the miniapp; approve their request on the heat card above. You can also invite judges by email. Judges sign in at <a className="underline" href="/login?next=%2Fcup%2Fjudge">/login</a> with the email you add here — no club membership needed. Select judges on each heat above. Organisers must also be invited and selected. Saved ratings stay if a judge is removed.</p>
            <ul className="grid gap-2">
              {state.judges.map((judge) => (
                <li key={judge.email} className={`${slotRow} justify-between`}>
                  <div className="min-w-0"><p className="truncate font-bold">{judge.name}</p><p className={`${monoPlain} truncate`}>{judge.email}</p></div>
                  <button type="button" className={linkButton} disabled={busy} onClick={() => void act(() => api(`/api/admin/cup/judges/${encodeURIComponent(judge.email)}`, "DELETE"), `${judge.name} removed.`)}>Remove</button>
                </li>
              ))}
              {!state.judges.length && <li className={`${mono} py-1`}>No judges invited yet.</li>}
            </ul>
            <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
              event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
              void act(() => api("/api/admin/cup/judges", "POST", { email: data.get("email"), name: data.get("name") }), "Judge invited.").then(() => form.reset());
            }}>
              <input className={input} name="email" type="email" required maxLength={254} placeholder="judge@example.com" autoComplete="off" aria-label="Judge's email" />
              <input className={input} name="name" required maxLength={80} placeholder="Name on the sheet" autoComplete="off" aria-label="Judge's name" />
              <button type="submit" className={primaryButton} disabled={busy}>Invite</button>
            </form>
          </section>

          {/* Ticker */}
          <section className={`${panel} grid gap-4`}>
            <h2 className={panelTitle}>Ticker</h2>
            <p className="text-sm text-fg-muted">Heat starts and results post themselves. Add a note for the crowd — the BBQ, the prize-giving, a shout-out.</p>
            <form className="flex gap-2" onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
              event.preventDefault(); const form = event.currentTarget; const message = String(new FormData(form).get("message") ?? "");
              void act(() => api("/api/admin/cup/ticker", "POST", { message }), "Posted.").then(() => form.reset());
            }}>
              <input className={input} name="message" required maxLength={200} placeholder="🔥 BBQ is on — grab a plate between heats" aria-label="Ticker note" />
              <button type="submit" className={primaryButton} disabled={busy}>Post</button>
            </form>
            <ul className="grid gap-1.5">
              {state.ticker.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 border-b border-line py-2 text-sm">
                  <span><span className={`${mono} mr-2`}>{new Date(item.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Indian/Mauritius" })}</span>{item.message}</span>
                  <button type="button" className={linkButton} disabled={busy} onClick={() => void act(() => api(`/api/admin/cup/ticker/${item.id}`, "DELETE"))}>×</button>
                </li>
              ))}
              {!state.ticker.length && <li className={`${mono} py-1`}>Nothing posted yet.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Avatar({ kid }: { kid: Entrant | undefined }) {
  if (kid?.photoVersion) return <img className={avatar} src={`/api/cup/photo/${kid.id}?v=${encodeURIComponent(kid.photoVersion)}`} alt="" width={36} height={36} loading="lazy" />;
  return <span className={avatarEmpty} aria-hidden="true">{(kid?.name ?? "?").slice(0, 1).toUpperCase()}</span>;
}
