import { useEffect, useMemo, useState } from "react";
import { formatScore, heatLabel, heatShort, rashieLabel } from "../../lib/comp";
import { cupTime } from "../../lib/cup-plan-config";
import type { MemberCupState, MemberEntrant, MemberHeat } from "../../lib/server/cup-members";
import { pill, rashieBlock, rashieSwatch, statusPill } from "../../lib/comp-ui";
import { avatar, avatarEmpty, card, cardLead, cardTitle, dot, eyebrow, heatCard, kidChip, link, mineTag, muted, select, slotRow, tab, timetableRow } from "../../lib/cup-members-ui";
import { cn } from "../../lib/cn";
import { HeatCountdown, HeatWarnings, useCompetitionClock } from "./CupClock";
import { Leaderboard } from "./CupLeaderboard";
import { useHydrated } from "./useHydrated";

// The members' cup board: the organiser's picture without the controls. The
// page renders it with the current state; from then on it polls the members'
// feed so the countdown, the scores and the ticker follow the day.
type RoundKey = number | "final";
type Props = { initial: MemberCupState; judgeHref: string; liveHref: string; cupHref: string };

const clock = (value: string) => new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Indian/Mauritius" });
const inRound = (heat: MemberHeat, key: RoundKey) => key === "final" ? heat.stage === "final" : heat.stage === "round" && heat.round === key;
const roundKeys = (rounds: number): RoundKey[] => [...Array.from({ length: rounds }, (_, i) => i + 1), "final"];
// The round to look at: the first with a heat still to run, else the last one drawn.
function currentRound(heats: MemberHeat[], rounds: number): RoundKey {
  const keys = roundKeys(rounds);
  return keys.find((key) => heats.some((heat) => inRound(heat, key) && heat.status !== "done")) ?? [...keys].reverse().find((key) => heats.some((heat) => inRound(heat, key))) ?? 1;
}
const statusLabel = (status: MemberHeat["status"]) => status === "running" ? "in the water" : status;

export default function CupMembers({ initial, judgeHref, liveHref, cupHref }: Props) {
  const [state, setState] = useState(initial);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<RoundKey | null>(null);
  const [surfer, setSurfer] = useState("");
  const now = useCompetitionClock(state.serverNow);
  // The countdown depends on the clock, so it joins after hydration rather than mismatching the server render.
  const hydrated = useHydrated();

  useEffect(() => {
    let alive = true;
    let loading = false;
    async function load() {
      if (loading) return;
      loading = true;
      try {
        const response = await fetch("/api/members/cup", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const next: MemberCupState = await response.json();
        if (alive) { setState(next); setFailed(false); }
      } catch { if (alive) setFailed(true); } finally { loading = false; }
    }
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 5000);
    const resume = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", resume);
    return () => { alive = false; window.clearInterval(poll); document.removeEventListener("visibilitychange", resume); };
  }, []);

  const { config, entrants, heats, me } = state;
  const kids = useMemo(() => new Map(entrants.map((kid) => [kid.id, kid])), [entrants]);
  const mine = useMemo(() => new Set(me.kids), [me.kids]);
  const times = useMemo(() => new Map((state.timetable?.rows ?? []).filter((row) => row.heatId).map((row) => [row.heatId!, row])), [state.timetable]);
  const shown = picked ?? currentRound(heats, config.rounds);
  const roundHeats = heats.filter((heat) => inRound(heat, shown));
  const running = heats.filter((heat) => heat.status === "running");
  const upNext = heats.filter((heat) => heat.status === "scheduled").slice(0, 2);
  const showcase = running.length ? running : upNext;
  const ages = entrants.filter((kid) => kid.age !== null).map((kid) => kid.age!);
  const wildcards = entrants.filter((kid) => kid.wildcard).length;
  const ownKids = entrants.filter((kid) => mine.has(kid.id));
  const judging = me.judging.map((id) => heats.find((heat) => heat.id === id)).filter((heat): heat is MemberHeat => !!heat);
  const pendingVolunteer = me.volunteering.some((request) => request.status === "pending");
  const Name = ({ kidId }: { kidId: string }) => <span className={mine.has(kidId) ? "font-bold" : undefined}>{kids.get(kidId)?.name ?? "?"}</span>;

  return (
    <div className="grid gap-6" data-cup-members>
      <HeatWarnings heats={heats} now={now} />
      {failed && <p role="status" className={muted}>Connection lost. Showing the last update; reconnecting…</p>}

      {/* Where the day stands */}
      <section className={card} aria-labelledby="cup-now">
        <div className={cardLead}>
          <h2 id="cup-now" className={cardTitle}>{entrants.length} {entrants.length === 1 ? "surfer" : "surfers"} in the draw</h2>
          <p className={eyebrow}>{ages.length ? `ages ${Math.min(...ages)}–${Math.max(...ages)}` : "ages to follow"} · {wildcards} {wildcards === 1 ? "wildcard" : "wildcards"} · public board {config.live ? "live" : "not yet public"} · updated {clock(state.serverNow)}</p>
        </div>
        {showcase.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {showcase.map((heat) => (
              <li key={heat.id} className="rounded-lg border border-line p-3" data-showcase={heat.status}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn(pill, statusPill[heat.status])}>{heat.status === "running" ? "● in the water" : "up next"}</span>
                  <strong className="text-[15px]">{heatLabel(heat)}</strong>
                  {heat.status === "running" ? hydrated && <HeatCountdown heat={heat} now={now} /> : times.get(heat.id) && <span className={eyebrow}>{cupTime(times.get(heat.id)!.start)}</span>}
                </div>
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
                  {heat.slots.map((slot) => <span key={slot.kidId} className="inline-flex items-center gap-1.5"><span className={cn(dot, rashieBlock[slot.colour])} aria-label={`${rashieLabel[slot.colour]} rashie`} /><Name kidId={slot.kidId} /></span>)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`${muted} mt-3`}>{heats.length ? "Every heat has run. Results below." : "The heats have not been drawn yet. They appear here as soon as the organisers draw them."}</p>
        )}
        {(judging.length > 0 || pendingVolunteer) && (
          <p className="mt-3 text-[13px]" data-judging>
            {judging.length > 0 && <>You’re selected to judge {judging.map(heatShort).join(", ")}. </>}
            {pendingVolunteer && <>Your volunteer request is waiting for the organisers. </>}
            <a className="underline underline-offset-4" href={judgeHref}>Open the judge sheet</a>
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-6">
          <a className={link} href={judgeHref}>Judge sheet · volunteer or score ↗</a>
          <a className={link} href={liveHref}>Public live board ↗</a>
          <a className={link} href={cupHref}>The Cup page ↗</a>
        </div>
      </section>

      {/* The member's own duckies */}
      {ownKids.length > 0 && (
        <section className={card} aria-labelledby="cup-mine">
          <h2 id="cup-mine" className={cardTitle}>Your {ownKids.length === 1 ? "duckie" : "duckies"}</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {ownKids.map((kid) => {
              const own = heats.filter((heat) => heat.slots.some((slot) => slot.kidId === kid.id));
              const standing = state.standings.find((row) => row.kidId === kid.id);
              return (
                <li key={kid.id} className="grid gap-3 rounded-lg border border-line p-4" data-own-kid>
                  <div className="flex items-center gap-3">
                    <Avatar kid={kid} className="h-12 w-12 text-lg" />
                    <div className="min-w-0">
                      <p className="text-[16px] font-semibold"><a className="hover:underline" href={`/gallery/duckies/${kid.id}`}>{kid.name}</a></p>
                      <p className={eyebrow}>{kid.age === null ? "age tbc" : `${kid.age} yrs`} · No. {kid.number}{standing && standing.total > 0 ? ` · ${formatScore(standing.total)} ★ ${config.plan ? "qualifying" : "best 2"} · #${standing.rank}` : ""}</p>
                    </div>
                  </div>
                  {own.length ? (
                    <ol className="grid gap-1.5 text-[13px]">
                      {own.map((heat) => {
                        const slot = heat.slots.find((entry) => entry.kidId === kid.id)!;
                        const row = times.get(heat.id);
                        return (
                          <li key={heat.id} className="flex flex-wrap items-center gap-2">
                            <span className={rashieSwatch(slot.colour, "h-6 w-6 border-line text-[9px]")} aria-hidden="true">{rashieLabel[slot.colour].slice(0, 1)}</span>
                            <strong>{heatLabel(heat)}</strong>
                            {row && <span className={eyebrow}>{cupTime(row.start)}–{cupTime(row.end)}</span>}
                            <span className={eyebrow}>{rashieLabel[slot.colour]} rashie · {statusLabel(heat.status)}{slot.score !== null ? ` · ${formatScore(slot.score)} ★` : ""}</span>
                          </li>
                        );
                      })}
                    </ol>
                  ) : <p className={muted}>Waiting for the draw.</p>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Lineup */}
      <section className={card} aria-labelledby="cup-lineup">
        <div className={cardLead}>
          <h2 id="cup-lineup" className={cardTitle}>Lineup</h2>
          <p className={eyebrow}>in sign-up order · {entrants.length - wildcards} {entrants.length - wildcards === 1 ? "duckie" : "duckies"} · {wildcards} {wildcards === 1 ? "wildcard" : "wildcards"}</p>
        </div>
        {entrants.length ? (
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-lineup>
            {entrants.map((kid) => {
              const first = heats.find((heat) => heat.stage === "round" && heat.round === 1 && heat.slots.some((slot) => slot.kidId === kid.id));
              const colour = first?.slots.find((slot) => slot.kidId === kid.id)?.colour;
              return (
                <li key={kid.id} className={kidChip} data-mine={mine.has(kid.id)}>
                  <span className="w-6 shrink-0 text-right font-mono text-[11px] text-fg-muted">{String(kid.number).padStart(2, "0")}</span>
                  <Avatar kid={kid} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold"><a className="hover:underline" href={`/gallery/duckies/${kid.id}`}>{kid.name}</a></p>
                    <p className={eyebrow}>{kid.age === null ? "age tbc" : `${kid.age} yrs`}{first && colour ? ` · ${heatShort(first)} · ${rashieLabel[colour]}` : ""}</p>
                  </div>
                  {mine.has(kid.id) ? <span className={mineTag}>yours</span> : <span className="club-role" data-kind={kid.wildcard ? undefined : "duckie"}>{kid.wildcard ? "Wildcard" : "Duckie"}</span>}
                </li>
              );
            })}
          </ol>
        ) : <p className={`${muted} mt-3`}>Nobody has registered yet.</p>}
      </section>

      {/* Ticker */}
      {state.ticker.length > 0 && (
        <section className={card} aria-labelledby="cup-ticker">
          <h2 id="cup-ticker" className={cardTitle}>Latest from the beach</h2>
          <ul className="mt-2 grid">
            {state.ticker.map((item) => <li key={item.id} className="flex gap-3 border-b border-line py-2.5 text-[13px] last:border-b-0"><span className={`${eyebrow} shrink-0 pt-0.5`}>{clock(item.at)}</span><span>{item.message}</span></li>)}
          </ul>
        </section>
      )}

      {/* Timetable */}
      {state.timetable && (
        <section className={card} aria-labelledby="cup-timetable">
          <div className={cardLead}>
            <h2 id="cup-timetable" className={cardTitle}>Heat timetable</h2>
            <p className={eyebrow}>Mauritius time · estimated finish {cupTime(state.timetable.finish)}</p>
          </div>
          <p className={`${muted} mt-2`}>Three rounds and a placement final for every surfer. Later pairings appear once the previous round is complete; a late heat moves the rest of the day along with it.</p>
          {state.timetable.spareMinutes < 0 && <p role="status" className="mt-2 text-[13px] font-semibold">Running about {-state.timetable.spareMinutes} minutes past the planned finish.</p>}
          <label className="mt-4 grid max-w-xs gap-1.5 text-[13px] font-semibold">Find a surfer’s heats
            <select className={select} value={surfer} onChange={(event) => setSurfer(event.target.value)}>
              <option value="">All surfers</option>
              {entrants.map((kid) => <option key={kid.id} value={kid.id}>{kid.name}</option>)}
            </select>
          </label>
          <ol className="mt-3 grid">
            {state.timetable.rows.filter((row) => !surfer || !row.heatId || row.slots.some((slot) => slot.kidId === surfer)).map((row) => (
              <li key={row.key} className={timetableRow} data-status={row.status}>
                <span className="font-mono text-[13px] tabular-nums">{cupTime(row.start)}–{cupTime(row.end)}</span>
                <span><strong className="text-[14px]">{row.label}</strong><span className={`${eyebrow} block`}>{row.status === "pending" ? "draw pending" : statusLabel(row.status)}</span></span>
                <span className="flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
                  {row.slots.length
                    ? row.slots.map((slot) => <span key={slot.kidId} className="inline-flex items-center gap-1.5"><span className={cn(dot, rashieBlock[slot.colour])} aria-hidden="true" /><Name kidId={slot.kidId} /></span>)
                    : <span className={muted}>{row.stage === "final" ? `Qualifying places ${(row.number - 1) * 4 + 1}–${Math.min(row.number * 4, entrants.length)}` : "Surfers assigned when this round is drawn"}</span>}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Heats, round by round */}
      <section className="grid gap-4" aria-labelledby="cup-heats">
        <div className={cardLead}>
          <h2 id="cup-heats" className={cardTitle}>Heats</h2>
          {heats.length > 0 && <p className={eyebrow}>{roundHeats.length ? `${roundHeats.length} ${roundHeats.length === 1 ? "heat" : "heats"} · up to ${shown === "final" ? config.finalSize : config.heatSize} surfers each` : "not drawn yet"}</p>}
        </div>
        {heats.length === 0 ? (
          <p className={`${card} ${muted}`}>The heats have not been drawn yet. They appear here as soon as the organisers draw them.</p>
        ) : (
          <>
            <div role="tablist" aria-label="Rounds" className="flex flex-wrap gap-2">
              {roundKeys(config.rounds).map((key) => {
                const count = heats.filter((heat) => inRound(heat, key)).length;
                return (
                  <button key={key} role="tab" type="button" aria-selected={shown === key} className={tab} onClick={() => setPicked(key)}>
                    {key === "final" ? "The Final" : `Round ${key}`}
                    <span className="font-mono text-[10px] opacity-70">{count ? `${count} ${count === 1 ? "heat" : "heats"}` : "not drawn"}</span>
                  </button>
                );
              })}
            </div>
            {roundHeats.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {roundHeats.map((heat) => {
                  const row = times.get(heat.id);
                  const capacity = shown === "final" ? config.finalSize : config.heatSize;
                  return (
                    <article key={heat.id} className={heatCard} aria-label={heatLabel(heat)}>
                      <header className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-[16px] font-semibold">{heatLabel(heat)}</h3>
                          <p className={eyebrow}>{heat.slots.length}/{capacity} · {row ? `${cupTime(row.start)}–${cupTime(row.end)}` : `${heat.durationMinutes} min`}</p>
                        </div>
                        <span className={cn(pill, statusPill[heat.status])}>{heat.status === "running" ? "● live" : heat.status}</span>
                      </header>
                      {heat.status === "running" && hydrated && <HeatCountdown heat={heat} now={now} />}
                      <ul className="grid gap-2">
                        {heat.slots.map((slot) => {
                          const kid = kids.get(slot.kidId);
                          return (
                            <li key={slot.kidId} className={slotRow} data-mine={mine.has(slot.kidId)}>
                              <span className={rashieSwatch(slot.colour, "h-8 w-8 border-line")} aria-label={`${rashieLabel[slot.colour]} rashie`}>{rashieLabel[slot.colour].slice(0, 1)}</span>
                              <Avatar kid={kid} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-semibold">{kid?.name ?? "Unknown"}{mine.has(slot.kidId) && <span className={`${mineTag} ml-2`}>yours</span>}</p>
                                <p className={`${eyebrow} truncate`}>{kid?.age ?? "?"} yrs · {slot.score === null ? "" : `${formatScore(slot.score)} ★ · `}{slot.waves} {slot.waves === 1 ? "wave" : "waves"}</p>
                              </div>
                            </li>
                          );
                        })}
                        {heat.slots.length === 0 && <li className={muted}>Nobody in this heat yet.</li>}
                      </ul>
                      <p className={`${eyebrow} border-t border-line pt-3`}>{heat.judges.length ? `Judges: ${heat.judges.join(", ")}` : "No judges selected yet"}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className={`${card} ${muted}`}>{shown === "final" ? "The final is built from the leaderboard once qualifying is complete." : `Round ${shown} has not been drawn yet.`}</p>
            )}
          </>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Leaderboard */}
        <section className={`${card} overflow-x-auto`} aria-labelledby="cup-board">
          <div className={cardLead}>
            <h2 id="cup-board" className={cardTitle}>Leaderboard</h2>
            <p className={eyebrow}>{config.plan ? "qualifying: average of completed rounds · final places apart" : "best 2 runs averaged · 5 stars maximum · final apart"}</p>
          </div>
          <Leaderboard rows={state.standings} rounds={config.rounds} guided={!!config.plan} highlight={mine} />
        </section>

        <div className="grid content-start gap-6">
          {/* Judges */}
          <section className={card} aria-labelledby="cup-judges">
            <div className={cardLead}>
              <h2 id="cup-judges" className={cardTitle}>Judges</h2>
              <p className={eyebrow}>{state.judges.length}</p>
            </div>
            <p className={`${muted} mt-2`}>Parents and volunteers the organisers picked for a heat. Want to judge one? Volunteer on the <a className="underline underline-offset-4" href={judgeHref}>judge sheet</a>.</p>
            {state.judges.length
              ? <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected judges">{state.judges.map((name) => <li key={name} className="rounded-full border border-line px-3 py-1 text-[13px] font-semibold">{name}</li>)}</ul>
              : <p className={`${muted} mt-3`}>No judges selected yet.</p>}
          </section>

          {/* The format */}
          <section className={card} aria-labelledby="cup-format">
            <h2 id="cup-format" className={cardTitle}>How the day works</h2>
            {config.plan ? (
              <ol className="mt-3 grid gap-2 text-[13px] leading-relaxed">
                <li><strong>1 · Shuffle.</strong> Random opening heats; every registered child gets a slot.</li>
                <li><strong>2 · Meet new surfers.</strong> {config.plan.seedAfter === 1 ? "Nearby scores start grouping, with as few repeats as possible." : "The field mixes again, avoiding repeat opponents."} Rashie colours rotate.</li>
                <li><strong>3 · Surf near your level.</strong> Nearby qualifying scores group together. An easier group gives no extra points.</li>
                <li><strong>4 · Finals for all.</strong> The three-round average sets the final groups. Lower groups surf first; the Cup final goes last.</li>
              </ol>
            ) : (
              <p className={`${muted} mt-3`}>{config.rounds} qualifying {config.rounds === 1 ? "round" : "rounds"} in heats of up to {config.heatSize}, then a final for the top {config.finalSize}. Judges average each heat’s best two runs; five stars is the maximum.</p>
            )}
            <p className={`${muted} mt-3`}>Results are provisional until the organisers call them.</p>
            {config.finalReview && <p className="mt-3 text-[13px]"><strong>Recorded tie decision:</strong> {config.finalReview.reason}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}

function Avatar({ kid, className }: { kid: MemberEntrant | undefined; className?: string }) {
  if (kid?.photo) return <img className={cn(avatar, className)} src={kid.photo} alt="" width={36} height={36} loading="lazy" />;
  return <span className={cn(avatarEmpty, className)} aria-hidden="true">{(kid?.name ?? "?").slice(0, 1).toUpperCase()}</span>;
}
