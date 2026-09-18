import { useEffect, useMemo, useRef, useState } from "react";
import { best2, byRunningOrder, formatScore, heatLabel, heatShort, rashieLabel, WAVE_SCORES, type Heat, type Rashie, type Wave } from "../../lib/comp";
import { errorNotice, heatTab, judgeAvatar, judgeAvatarEmpty, linkButton, mono, monoPlain, notice as noticeClass, pill, rashieBlock, scoreKey, scorePad, statusPill, surferBand, surferCard, waveChip, waveChipBest } from "../../lib/comp-ui";
import SignOutButton from "./SignOutButton";

// The judge's sheet: pick the heat, see the four kids with their rashie and
// face, tap a score per wave as it happens. Only this judge's own scores are
// shown; the leaderboard averages everyone's best two later.
type Kid = { id: string; name: string; age: number | null; photoVersion: string | null };
type JudgeState = { judge: { email: string; name: string; organiser: boolean }; config: { rounds: number; heatSize: number }; kids: Record<string, Kid>; heats: Heat[]; waves: Wave[] };
const criteria = [
  ["Paddle & commit", "Go for the wave. Don't pull back."],
  ["Pop-up", "Get to your feet. No knees, no cap."],
  ["Stance", "Knees bent, eyes forward, hands chill."],
  ["Ride", "Stay standing. Ride it in — length and size count."],
  ["Stoke", "Finish with a smile. Claim it."],
];
const api = async (url: string, method = "GET", body?: unknown) => {
  const response = await fetch(url, { method, cache: "no-store", headers: { "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Couldn't save that score.");
  return data;
};

export default function CupJudge() {
  const [state, setState] = useState<JudgeState | null>(null);
  const [heatId, setHeatId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // A poll that was in flight when a score was tapped must not overwrite it.
  const generation = useRef(0);

  async function load() {
    const version = ++generation.current;
    try {
      const data: JudgeState = await api("/api/cup/judge");
      if (version !== generation.current) return;
      data.heats.sort(byRunningOrder);
      setState(data); setError("");
      // Land on the heat in the water, else the next one up.
      setHeatId((current) => current && data.heats.some((heat) => heat.id === current) ? current : (data.heats.find((heat) => heat.status === "running") ?? data.heats.find((heat) => heat.status === "scheduled") ?? data.heats[0])?.id ?? null);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load the heats."); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const poll = window.setInterval(() => { if (!busy) void load(); }, 30000);
    return () => window.clearInterval(poll);
  }, [busy]);

  const heat = useMemo(() => state?.heats.find((entry) => entry.id === heatId) ?? null, [state, heatId]);

  async function score(kidId: string, value: number) {
    if (!heat || busy) return;
    generation.current++;
    setBusy(true); setError(""); setNotice("");
    try {
      if (editing) {
        const { wave } = await api(`/api/cup/judge/waves/${editing}`, "PATCH", { score: value });
        setState((current) => current && { ...current, waves: current.waves.map((entry) => entry.id === wave.id ? wave : entry) });
        setEditing(null);
      } else {
        const { wave } = await api("/api/cup/judge/waves", "POST", { heatId: heat.id, kidId, score: value });
        setState((current) => current && { ...current, waves: [...current.waves, wave] });
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't save that score."); }
    finally { setBusy(false); }
  }
  async function remove(wave: Wave) {
    if (busy || !window.confirm(`Drop wave ${wave.wave} (${formatScore(wave.score)})?`)) return;
    generation.current++;
    setBusy(true); setError("");
    try {
      await api(`/api/cup/judge/waves/${wave.id}`, "DELETE");
      setState((current) => current && { ...current, waves: current.waves.filter((entry) => entry.id !== wave.id) });
      if (editing === wave.id) setEditing(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't drop that wave."); }
    finally { setBusy(false); }
  }

  if (!state) return <p className={error ? errorNotice : `${mono} py-6`}>{error || "Loading the heats…"}</p>;
  return (
    <div className="grid gap-6 text-fg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">Judging as <strong>{state.judge.name}</strong> <span className={monoPlain}>{state.judge.email}</span></p>
        <SignOutButton className={linkButton} />
      </div>
      {(error || notice) && <p role="status" className={error ? errorNotice : noticeClass}>{error || notice}</p>}

      {!state.heats.length && <p className={noticeClass}>The heats are not drawn yet. Check back once the organisers have set the draw.</p>}

      {state.heats.length > 0 && (
        <div role="tablist" aria-label="Heats" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {state.heats.map((entry) => (
            <button key={entry.id} role="tab" type="button" aria-selected={entry.id === heatId} className={heatTab} onClick={() => { setHeatId(entry.id); setEditing(null); }}>
              <span className={`h-2.5 w-2.5 rounded-full ${entry.status === "running" ? "bg-coral-500 motion-safe:animate-pulse" : entry.status === "done" ? "bg-teal-500" : "bg-fg/30"}`} aria-hidden="true" />
              {heatShort(entry)}
            </button>
          ))}
        </div>
      )}

      {heat && (
        <section className="grid gap-4">
          <header className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-bold leading-tight [font-variation-settings:'wdth'_110] sm:text-3xl">{heatLabel(heat)}</h2>
            <span className={`${pill} ${statusPill[heat.status]}`}>{heat.status === "running" ? "● in the water" : heat.status}</span>
            <p className={`${mono} basis-full`}>Tap a score as each wave ends. Only your best two per kid count. Wipeout? Don't score it.</p>
          </header>
          <div className="grid gap-4 lg:grid-cols-2">
            {heat.slots.map((slot) => (
              <SurferCard key={slot.kidId} kid={state.kids[slot.kidId]} colour={slot.colour} busy={busy} editing={editing}
                waves={state.waves.filter((wave) => wave.heatId === heat.id && wave.kidId === slot.kidId).sort((a, b) => a.wave - b.wave)}
                onScore={(value) => void score(slot.kidId, value)} onEdit={(id) => setEditing((current) => current === id ? null : id)} onRemove={(wave) => void remove(wave)} />
            ))}
            {!heat.slots.length && <p className={noticeClass}>Nobody is in this heat yet.</p>}
          </div>
        </section>
      )}

      <details className="rounded-card border-2 border-edge bg-surface p-4">
        <summary className="cursor-pointer font-display font-bold [font-variation-settings:'wdth'_108]">What a 10 looks like</summary>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {criteria.map(([title, text]) => <li key={title}><strong>{title}</strong> — {text}</li>)}
        </ul>
        <p className={`${mono} mt-3`}>Score the whole ride 0.5–10. Bias toward yes when in doubt.</p>
      </details>
    </div>
  );
}

function SurferCard({ kid, colour, waves, busy, editing, onScore, onEdit, onRemove }: {
  kid: Kid | undefined; colour: Rashie; waves: Wave[]; busy: boolean; editing: string | null;
  onScore: (value: number) => void; onEdit: (id: string) => void; onRemove: (wave: Wave) => void;
}) {
  const top = [...waves].sort((a, b) => b.score - a.score).slice(0, 2).map((wave) => wave.id);
  const editingHere = editing && waves.some((wave) => wave.id === editing) ? waves.find((wave) => wave.id === editing)! : null;
  return (
    <article className={surferCard} aria-label={`${kid?.name ?? "Surfer"}, ${rashieLabel[colour].toLowerCase()} rashie`}>
      <div className={`${surferBand} ${rashieBlock[colour]}`}>
        {kid?.photoVersion ? <img className={judgeAvatar} src={`/api/cup/photo/${kid.id}?v=${encodeURIComponent(kid.photoVersion)}`} alt="" width={80} height={80} /> : <span className={judgeAvatarEmpty} aria-hidden="true">{(kid?.name ?? "?").slice(0, 1).toUpperCase()}</span>}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.2em] opacity-80">{rashieLabel[colour]} rashie{kid?.age !== null && kid?.age !== undefined ? ` · ${kid.age} yrs` : ""}</p>
          <p className="truncate font-display text-2xl font-extrabold leading-tight [font-variation-settings:'wdth'_112] sm:text-3xl">{kid?.name ?? "Unknown"}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] opacity-80">best 2</p>
          <p className="font-display text-3xl font-extrabold leading-none [font-variation-settings:'wdth'_112]">{formatScore(best2(waves.map((wave) => wave.score)))}</p>
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {waves.map((wave) => (
            <span key={wave.id} className="inline-flex items-center">
              <button type="button" className={`${waveChip} rounded-r-none ${top.includes(wave.id) ? waveChipBest : ""}`} aria-pressed={editing === wave.id} disabled={busy} onClick={() => onEdit(wave.id)} title="Tap to change this score">
                <span className={`${mono} text-current opacity-70`}>W{wave.wave}</span>{formatScore(wave.score)}
              </button>
              <button type="button" className={`${waveChip} rounded-l-none border-l-0 px-2.5 text-fg/60`} disabled={busy} onClick={() => onRemove(wave)} aria-label={`Drop wave ${wave.wave}`}>×</button>
            </span>
          ))}
          {!waves.length && <span className={mono}>No waves yet</span>}
        </div>
        <p className={mono}>{editingHere ? `Changing wave ${editingHere.wave} — tap the new score` : `Wave ${waves.length + 1} — tap the score`}</p>
        <div className={scorePad}>
          {WAVE_SCORES.map((value) => (
            <button key={value} type="button" className={`${scoreKey} ${editingHere?.score === value ? "bg-accent text-accent-fg" : ""}`} disabled={busy} onClick={() => onScore(value)}>{formatScore(value)}</button>
          ))}
        </div>
      </div>
    </article>
  );
}
