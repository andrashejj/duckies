import { AnimatePresence, MotionConfig, motion, type Variants } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { canCallRoll, clubDayLabel, clubDayShort, type TrainingBoard, type TrainingKid } from "../../lib/club-points";
import { cn } from "../../lib/cn";
import { card, cardLead, cardTitle, eyebrow, mineTag, muted } from "../../lib/cup-members-ui";
import {
  awayButton, boardPoints, boardRow, button, buttonNote, callCard, callName, callPhoto, callPhotoEmpty, crewGrid, crewMark, crewTile, crewTone,
  dayCount, dayPicker, dayTab, face, faceEmpty, field, firstTag, hereButton, hereChip, lineupBar, lineupDot, pointsGiven, podium, primaryButton,
  rank as rankBubble, segment, segmented, smallFace, smallFaceEmpty, statusKey, textButton,
} from "../../lib/training-ui";
import TrainingOrganiser, { type OrganiserTools } from "./TrainingOrganiser";
import { useHydrated } from "./useHydrated";

// Training in the club. Every member sees who was in the water and the club
// points leaderboard; organisers and the coaches they pick call the roll on the
// same page. "One by one" walks the crew in name order, here or away, ending on
// the points given; "Whole crew" is for a burst of arrivals. Every tap saves
// straight away, and saves run one after another so fast tapping never loses
// or reorders a mark. The leaderboard moves as the roll is called.

type Mark = "here" | "away";
type Mode = "deck" | "crew";
type Filter = "all" | "todo" | "here" | "away";
const MODE_KEY = "duckies.roll-call.mode";
const TOP = 10;

async function readResponse(response: Response): Promise<TrainingBoard> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Couldn't save the roll. Please try again.");
  return data;
}
/** The next duckie not yet called after `from`, wrapping round the crew. */
function nextToCall(kids: TrainingKid[], from: string | null) {
  const start = from ? kids.findIndex(kid => kid.id === from) : -1;
  for (let step = 1; step <= kids.length; step++) {
    const kid = kids[(start + step) % kids.length];
    if (kid.status === null && kid.id !== from) return kid.id;
  }
  return null;
}
const cardMotion: Variants = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, x: 0, y: 0, rotate: 0, transition: { type: "spring", stiffness: 420, damping: 34 } },
  // Here heads out to the water on the right, away back up the sand on the left.
  exit: (direction: number) => ({ opacity: 0, x: direction * 90, y: direction ? 0 : -12, rotate: direction * 3, pointerEvents: "none", transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }),
};
function Face({ kid, className, empty }: { kid: TrainingKid; className: string; empty: string }) {
  return kid.photoVersion
    ? <img className={className} src={`/api/training/photo/${kid.id}?v=${encodeURIComponent(kid.photoVersion)}`} alt="" />
    : <span aria-hidden="true" className={empty}>{kid.name.slice(0, 1)}</span>;
}

export default function ClubTraining({ initial, organiser }: { initial: TrainingBoard; organiser: OrganiserTools | null }) {
  const ready = useHydrated();
  const [board, setBoard] = useState(initial);
  const [date, setDate] = useState(initial.date);
  // Taps not yet confirmed by the server, shown straight away.
  const [pending, setPending] = useState<Record<string, Mark>>({});
  const [saving, setSaving] = useState(0);
  const [mode, setMode] = useState<Mode>("deck");
  const [currentId, setCurrentId] = useState(() => nextToCall(initial.kids, null));
  const [direction, setDirection] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inFlight = useRef(0);
  const queue = useRef(Promise.resolve());
  const latest = useRef<TrainingBoard | null>(null);
  // A poll that was in flight when a duckie was marked must not overwrite it.
  const generation = useRef(0);
  const reseat = useRef(false);
  const focusCall = useRef(false);

  const points = board.sessionPoints;
  const kids = useMemo(() => board.kids.map(kid => {
    const next = pending[kid.id];
    if (!next || next === kid.status) return kid;
    const change = next === "here" ? 1 : kid.status === "here" ? -1 : 0;
    return { ...kid, status: next, trainings: kid.trainings + change, points: kid.points + change * points,
      split: kid.split && { ...kid.split, training: kid.split.training + change * points } };
  }), [board.kids, pending, points]);
  const here = kids.filter(kid => kid.status === "here");
  const away = kids.filter(kid => kid.status === "away").length;
  const rest = kids.filter(kid => kid.status === null);
  const caller = canCallRoll(board.access);
  const loaded = board.date === date;
  const canMark = ready && caller && loaded && date <= board.today;
  const current = kids.find(kid => kid.id === currentId) ?? null;
  const recent = board.sessions.filter(session => session.date !== board.today).slice(0, 4);

  useEffect(() => {
    try { const saved = localStorage.getItem(MODE_KEY); if (saved === "deck" || saved === "crew") setMode(saved); }
    catch { /* A remembered mode is a convenience; the default works without storage. */ }
  }, []);
  function chooseMode(next: Mode) {
    // Back from the whole crew, pick up with the next duckie still to call.
    if (next === "deck" && mode === "crew" && current?.status) { setDirection(0); setCurrentId(nextToCall(kids, current.id)); }
    setMode(next);
    try { localStorage.setItem(MODE_KEY, next); } catch { /* See above. */ }
  }
  async function refresh(chosen: string) {
    const version = ++generation.current;
    try {
      const next = await readResponse(await fetch(`/api/training?date=${chosen}`, { cache: "no-store" }));
      if (version !== generation.current || inFlight.current) return;
      setBoard(next); setError("");
      if (reseat.current) { reseat.current = false; setDirection(0); setCurrentId(nextToCall(next.kids, null)); }
    } catch (err) { if (version === generation.current) setError(err instanceof Error ? err.message : "Couldn't load training."); }
  }
  useEffect(() => {
    void refresh(date);
    const timer = window.setInterval(() => { if (!inFlight.current && !document.hidden) void refresh(date); }, 20000);
    const focus = () => { if (!inFlight.current) void refresh(date); };
    window.addEventListener("focus", focus);
    return () => { generation.current++; clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [date]);
  function chooseDate(value: string) {
    if (!value || value === date || inFlight.current) return;
    reseat.current = true; setDate(value); setPending({}); setMessage(""); setError("");
    const url = new URL(location.href); url.searchParams.set("date", value); history.replaceState(null, "", url);
  }
  function mark(targets: TrainingKid[], status: Mark) {
    if (!canMark || !targets.length) return;
    const ids = targets.map(kid => kid.id);
    const body = JSON.stringify({ date, kidIds: ids, present: status === "here" });
    generation.current++; inFlight.current++; setSaving(inFlight.current); setError("");
    setPending(current => ({ ...current, ...Object.fromEntries(ids.map(id => [id, status])) }));
    setMessage(targets.length > 1 ? `${targets.length} duckies marked away.` : status === "here" ? `${targets[0].name} is here.${points ? ` +${points} points.` : ""}` : `${targets[0].name} is away.`);
    queue.current = queue.current.then(async () => {
      try {
        latest.current = await readResponse(await fetch("/api/training", { method: "PATCH", headers: { "Content-Type": "application/json" }, body }));
      } catch (err) {
        setPending(current => Object.fromEntries(Object.entries(current).filter(([id]) => !ids.includes(id))));
        setMessage("");
        setError(`${err instanceof Error ? err.message : "Couldn't save the roll."} ${targets.length > 1 ? "Those duckies are" : `${targets[0].name} is`} back as before.`);
      } finally {
        inFlight.current--; setSaving(inFlight.current);
        // Saves run in order, so the last good answer holds every mark before it.
        if (!inFlight.current) {
          const saved = latest.current; latest.current = null;
          if (saved) setBoard(saved);
          setPending({});
        }
      }
    });
  }
  function call(status: Mark) {
    if (!current || !canMark) return;
    const called = kids.map(kid => kid.id === current.id ? { ...kid, status } : kid);
    if (current.status !== status) mark([current], status);
    focusCall.current = true; setDirection(status === "here" ? 1 : -1);
    setCurrentId(nextToCall(called, current.id));
  }
  function step(by: 1 | -1) {
    if (!current) return;
    focusCall.current = true; setDirection(0);
    setCurrentId(kids[(kids.indexOf(current) + by + kids.length) % kids.length].id);
  }
  function walkFrom(id: string | null) { focusCall.current = true; setDirection(0); setCurrentId(id); }
  useEffect(() => {
    if (!caller || mode !== "deck") return;
    const keys = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || (event.target as HTMLElement | null)?.closest?.("input,select,textarea,[contenteditable]")) return;
      const action = ({ h: () => call("here"), a: () => call("away"), arrowright: () => step(1), arrowleft: () => step(-1) } as Record<string, () => void>)[event.key.toLowerCase()];
      if (!action) return;
      event.preventDefault(); action();
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  });

  const query = search.trim().toLocaleLowerCase();
  const visible = kids.filter(kid => `${kid.name} ${kid.guardians}`.toLocaleLowerCase().includes(query) && (filter === "all" || statusKey(kid.status) === filter));
  const filters: [Filter, string, number][] = [["all", "All", kids.length], ["todo", "To call", rest.length], ["here", "Here", here.length], ["away", "Away", away]];
  const first = current && current.trainings - (current.status === "here" ? 1 : 0) === 0;
  // Confirms each mark in words; the card, the bar and the leaderboard move first.
  const status = <p className="mt-3 min-h-5 text-[13px] font-semibold" role="status" aria-live="polite">{message}{saving > 0 && <span className="ml-2 font-normal text-fg-muted motion-safe:animate-pulse">Saving…</span>}</p>;

  return <MotionConfig reducedMotion="user"><div className="grid gap-6">
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
      <section className={card} aria-labelledby="training-roll" data-saving={saving > 0}>
        <div className={cardLead}>
          <h2 id="training-roll" className={cardTitle}>Roll call</h2>
          <p className={eyebrow}>{clubDayLabel(date)}{points ? ` · +${points} points each` : ""}</p>
        </div>
        <div role="group" aria-label="Training day" className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <button type="button" className={dayTab} aria-pressed={date === board.today} disabled={!ready || saving > 0} onClick={() => chooseDate(board.today)}>Today <span className={dayCount}>{clubDayShort(board.today)}</span></button>
          {recent.map(session => <button key={session.date} type="button" className={dayTab} aria-pressed={date === session.date} disabled={!ready || saving > 0} onClick={() => chooseDate(session.date)}>{clubDayShort(session.date)} <span className={dayCount}>{session.present} here</span></button>)}
          <input type="date" aria-label="Training date" className={dayPicker} value={date} max={board.today} disabled={!ready || saving > 0} onChange={event => chooseDate(event.target.value)} />
        </div>
        {error && <div role="alert" className="mt-3 rounded-lg border border-coral-500/50 bg-coral-500/[0.06] px-3 py-2 text-[13px] text-fg">{error} <button type="button" className="cursor-pointer font-semibold underline underline-offset-4" onClick={() => void refresh(date)}>Reload</button></div>}

        {!caller ? <div className="mt-4">
          {!loaded ? <p className={muted}>Loading this training…</p> : here.length ? <>
            <p className="text-[15px] font-semibold" data-roll-count>{here.length} in the water</p>
            <ul aria-label="Here" className="mt-3 flex flex-wrap gap-2">{here.map(kid => <li key={kid.id} data-mine={kid.mine} className={hereChip}>
              <Face kid={kid} className={cn(smallFace, "h-7 w-7")} empty={cn(smallFaceEmpty, "h-7 w-7 text-[12px]")} />{kid.name}{kid.mine && <span className={mineTag}>yours</span>}
            </li>)}</ul>
          </> : <p className={muted}>{date === board.today ? "The roll hasn’t been called yet today." : "Nobody was marked here that day."}</p>}
        </div> : !kids.length ? <p className={cn(muted, "mt-4")}>Add duckies to the club roster to call the roll.</p> : <>
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-[15px] font-semibold" data-roll-count>{loaded ? `${here.length} here · ${away} away · ${rest.length} to call` : "Loading this training…"}</p>
            {points > 0 && loaded && <p className="text-[13px] font-semibold text-fg-muted" data-points-given>+{here.length * points} points</p>}
          </div>
          <div aria-hidden="true" className={cn(lineupBar, "mt-2")}>{kids.map(kid => <span key={kid.id} className={lineupDot[statusKey(kid.status)]} />)}</div>
          <div role="group" aria-label="How to call the roll" className={cn(segmented, "mt-4")}>
            <button type="button" className={segment} aria-pressed={mode === "deck"} onClick={() => chooseMode("deck")}>One by one</button>
            <button type="button" className={segment} aria-pressed={mode === "crew"} onClick={() => chooseMode("crew")}>Whole crew</button>
          </div>

          {mode === "deck" ? <div className="relative mt-3">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              {current ? <motion.article key={current.id} custom={direction} variants={cardMotion} initial="enter" animate="center" exit="exit" className={callCard} aria-label={`Calling ${current.name}`}>
                <div className="flex w-full items-center justify-between gap-2">
                  <span className={eyebrow}>{kids.indexOf(current) + 1} of {kids.length}</span>
                  {first ? <span className={firstTag}>First training</span> : <span className={eyebrow}>{current.trainings} trainings</span>}
                </div>
                <Face kid={current} className={callPhoto} empty={callPhotoEmpty} />
                <div className="min-w-0 max-w-full">
                  <h3 className={callName}>{current.name}</h3>
                  {current.guardians && <p className="mt-1 text-[13px] break-words text-fg-muted">{current.guardians}</p>}
                </div>
                <div className="mt-1 grid w-full grid-cols-2 gap-2.5">
                  <button type="button" className={awayButton} aria-label={`Away: ${current.name}`} aria-pressed={current.status === "away"} disabled={!canMark} onClick={() => call("away")}>
                    Away<span className={buttonNote}>Not today</span>
                  </button>
                  <button type="button" className={hereButton} aria-label={`Here: ${current.name}`} aria-pressed={current.status === "here"} disabled={!canMark} onClick={() => call("here")}
                    ref={target => { if (target && focusCall.current) { focusCall.current = false; target.focus({ preventScroll: true }); } }}>
                    Here<span className={buttonNote}>{points ? `+${points} points` : "In the water"}</span>
                  </button>
                </div>
                <div className="flex w-full items-center justify-between gap-2">
                  <button type="button" className={textButton} onClick={() => step(-1)}>← Back</button>
                  <span aria-hidden="true" className="hidden text-[11px] text-fg-muted sm:inline">Keys: H here · A away · ← →</span>
                  <button type="button" className={textButton} onClick={() => step(1)}>Skip →</button>
                </div>
              </motion.article> : <motion.article key="done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cn(callCard, "gap-4 py-6")} aria-label="Roll call summary">
                <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.05 }}>
                  <p className={pointsGiven}>{points ? `+${here.length * points}` : here.length}</p>
                  <p className={cn(eyebrow, "mt-1")}>{points ? "points given" : "here"}</p>
                </motion.div>
                <div>
                  <h3 className="text-[20px] font-[650] tracking-[-0.02em]">{rest.length ? `${rest.length} still to call` : "That’s the whole crew."}</h3>
                  <p className={cn(muted, "mt-1")}>{here.length} here, {away} away.</p>
                </div>
                {here.length > 0 && <ul aria-label="Here today" className="flex flex-wrap justify-center gap-1.5">{here.map(kid => <li key={kid.id} className="rounded-full bg-teal-500/10 px-2.5 py-1 text-[12px] font-semibold text-ok">✓ {kid.name}</li>)}</ul>}
                <div className="flex flex-wrap justify-center gap-2">
                  {rest.length > 0 && <button type="button" className={primaryButton} onClick={() => walkFrom(nextToCall(kids, null))}>Keep calling</button>}
                  <button type="button" className={button} onClick={() => chooseMode("crew")}>Check the whole crew</button>
                  <button type="button" className={button} onClick={() => walkFrom(kids[0].id)}>Walk the roll again</button>
                </div>
              </motion.article>}
            </AnimatePresence>
            {status}
          </div> : <div className="mt-4">
            <div className="grid gap-3">
              <label className="grid gap-1.5"><span className="sr-only">Find a duckie</span><input type="search" className={field} placeholder="Find a duckie or parent…" aria-label="Find a duckie" value={search} onChange={event => setSearch(event.target.value)} /></label>
              <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
                {filters.map(([key, label, count]) => <button key={key} type="button" className={dayTab} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label} <span className={dayCount}>{count}</span></button>)}
              </div>
            </div>
            {status}
            <ul className={cn(crewGrid, "mt-1")}>{visible.map(kid => <li key={kid.id}>
              <button type="button" className={cn(crewTile, crewTone[statusKey(kid.status)])} aria-label={kid.name} aria-pressed={kid.status === "here"} disabled={!canMark} onClick={() => mark([kid], kid.status === "here" ? "away" : "here")}>
                <Face kid={kid} className={face} empty={faceEmpty} />
                <span className="text-[14px] leading-tight font-semibold break-words">{kid.name}</span>
                <span className={crewMark[statusKey(kid.status)]}>{kid.status === "here" ? `✓ Here${points ? ` +${points}` : ""}` : kid.status === "away" ? "Away" : "Tap when here"}</span>
              </button>
            </li>)}</ul>
            {visible.length === 0 && <p className={cn(muted, "py-4")}>No duckies match. Try another name or filter.</p>}
            {rest.length > 0 && <button type="button" className={cn(button, "mt-4")} disabled={!canMark} onClick={() => mark(rest, "away")}>Mark the {rest.length} still to call as away</button>}
          </div>}
        </>}
      </section>
      <Leaderboard kids={kids} />
    </div>
    {organiser && <TrainingOrganiser {...organiser} onRulesSaved={() => void refresh(date)} />}
  </div></MotionConfig>;
}

function Leaderboard({ kids }: { kids: TrainingKid[] }) {
  const [everyone, setEveryone] = useState(false);
  const sorted = [...kids].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  // Equal points share a place (1, 2, 2, 4).
  const ranked = sorted.reduce<{ kid: TrainingKid; place: number }[]>((rows, kid, index) =>
    [...rows, { kid, place: index && sorted[index - 1].points === kid.points ? rows[index - 1].place : index + 1 }], []);
  const shown = everyone ? ranked : ranked.filter((row, index) => index < TOP || row.kid.mine);
  return <section className={cn(card, "lg:sticky lg:top-6")} aria-labelledby="training-leaderboard">
    <div className={cardLead}><h2 id="training-leaderboard" className={cardTitle}>Leaderboard</h2><p className={eyebrow}>club points · all time</p></div>
    {kids.length ? <ol aria-label="Club points leaderboard" className="mt-2">{shown.map(({ kid, place }) => <motion.li layout="position" key={kid.id} className={boardRow} data-mine={kid.mine}>
      <span className={cn(rankBubble, kid.points > 0 && podium[place])}><span className="sr-only">Place </span>{place}</span>
      <Face kid={kid} className={smallFace} empty={smallFaceEmpty} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5"><span className={cn("truncate text-[14px]", kid.mine ? "font-bold" : "font-semibold")}>{kid.name}</span>{kid.mine && <span className={mineTag}>yours</span>}</span>
        <span className="block text-[12px] text-fg-muted">{[`${kid.trainings} ${kid.trainings === 1 ? "training" : "trainings"}`, ...(kid.split ? ([["granola", kid.split.granola], ["Cup", kid.split.cup]] as const).filter(([, value]) => value).map(([label, value]) => `${label} ${value}`) : [])].join(" · ")}</span>
      </span>
      <span className={boardPoints}>{kid.points}<span className="ml-0.5 text-[11px] font-normal text-fg-muted">pts</span></span>
    </motion.li>)}</ol> : <p className={cn(muted, "mt-3")}>No duckies on the roster yet.</p>}
    {ranked.length > shown.length && <button type="button" className={cn(textButton, "mt-1 -ml-2")} onClick={() => setEveryone(true)}>Show all {ranked.length} duckies</button>}
  </section>;
}
