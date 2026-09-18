import { useEffect, useState } from "react";
import { formatScore, rashieLabel, type HeatStatus, type Rashie, type Standing, type TickerItem } from "../../lib/comp";
import { liveTicker, mono, panel, panelTitle, pill, podium, rankBubble, rashieBlock, statusPill } from "../../lib/comp-ui";
import { Leaderboard } from "./CupLeaderboard";

// The public live board: the ticker, who is in the water, the leaderboard and
// every heat's result. Polls the live feed; shows a teaser until the
// organisers switch the board on.
type PublicHeat = { id: string; stage: "round" | "final"; round: number; number: number; label: string; status: HeatStatus; startedAt: string | null; surfers: { name: string; colour: Rashie; score: number | null }[] };
type Live =
  | { live: false; name: string }
  | { live: true; name: string; updatedAt: string; rounds: number; running: PublicHeat[]; upNext: PublicHeat[]; ticker: TickerItem[]; leaderboard: Omit<Standing, "kidId">[]; final: PublicHeat | null; heats: PublicHeat[] };

const elapsed = (since: string | null, now: number) => {
  if (!since) return "";
  const seconds = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

export default function CupLive({ dateLabel }: { dateLabel: string }) {
  const [data, setData] = useState<Live | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch("/api/cup/live", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const next: Live = await response.json();
        if (alive) { setData(next); setFailed(false); }
      } catch { if (alive) setFailed(true); }
    }
    void load();
    const poll = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 15000);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { alive = false; window.clearInterval(poll); window.clearInterval(tick); };
  }, []);

  if (!data) return <p className={`${mono} px-6 py-10 text-center`}>{failed ? "The live board is taking a breather. Hang on…" : "Tuning in…"}</p>;
  if (!data.live) {
    return (
      <section className={`${panel} mx-auto max-w-2xl text-center`}>
        <p className={mono}>{dateLabel}</p>
        <h2 className={`${panelTitle} mt-3 text-3xl`}>The board lights up on the day.</h2>
        <p className="mt-3 text-fg-muted">Heats, scores and the leaderboard land here live from Tamarin Bay, updated wave by wave. Bookmark it — first heat at 14:00.</p>
      </section>
    );
  }

  const messages = data.ticker.length ? data.ticker.map((item) => item.message) : [`${data.name} · live from Tamarin Bay`, "Heats of four · best two waves count · rounds add up"];
  const inWater = data.running.length > 0;
  const showcase = inWater ? data.running : data.upNext;
  const results = [...data.heats].reverse().filter((heat) => heat.status === "done");
  return (
    <div className="grid gap-8">
      <div className="overflow-hidden border-y-2 border-edge bg-ink-950 py-3 text-cream" aria-label="Latest from the beach">
        <div className={liveTicker}>
          <span>{messages.map((message, index) => <span key={index}>{message}<i>✦</i></span>)}</span>
          <span aria-hidden="true">{messages.map((message, index) => <span key={index}>{message}<i>✦</i></span>)}</span>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 lg:px-10">
        <section className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`${pill} ${inWater ? statusPill.running : statusPill.scheduled}`}>{inWater ? "● in the water now" : showcase.length ? "up next" : "between heats"}</span>
            <p className={mono}>updated {new Date(data.updatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Indian/Mauritius" })} · refreshes on its own</p>
          </div>
          {showcase.length ? showcase.map((heat) => (
            <article key={heat.id} className={`${panel} grid gap-4`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className={`${panelTitle} text-2xl sm:text-3xl`}>{heat.label}</h2>
                {heat.status === "running" && <p className="font-mono text-2xl font-semibold tabular-nums text-accent-text">{elapsed(heat.startedAt, now)}</p>}
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {heat.surfers.map((surfer) => (
                  <li key={surfer.colour} className={`rounded-card border-2 border-edge p-4 shadow-sticker-sm ${rashieBlock[surfer.colour]}`}>
                    <p className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.2em] opacity-80">{rashieLabel[surfer.colour]}</p>
                    <p className="mt-1 font-display text-2xl font-extrabold leading-tight [font-variation-settings:'wdth'_112]">{surfer.name}</p>
                    <p className="mt-2 font-display text-3xl font-extrabold leading-none [font-variation-settings:'wdth'_112]">{surfer.score === null ? <span className="text-[1rem] opacity-70">waiting…</span> : formatScore(surfer.score)}</p>
                  </li>
                ))}
              </ul>
            </article>
          )) : (
            <p className={`${panel} text-fg-muted`}>No heat in the water right now. First heat at 14:00 — the BBQ keeps rolling in between.</p>
          )}
        </section>

        {data.final && (
          <section className={`${panel} grid gap-4 bg-sticker-sun`}>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className={`${panelTitle} text-2xl sm:text-3xl`}>The Final</h2>
              <span className={`${pill} ${statusPill[data.final.status]}`}>{data.final.status === "running" ? "● in the water" : data.final.status}</span>
            </div>
            <ol className="grid gap-2">
              {data.final.surfers.map((surfer, index) => (
                <li key={surfer.colour} className="flex items-center gap-3 rounded-xl border-2 border-edge bg-surface px-3 py-2">
                  <span className={`${rankBubble} ${surfer.score !== null ? podium[index + 1] ?? "" : "opacity-50"}`}>{index + 1}</span>
                  <span className={`h-6 w-6 rounded-full border-2 border-edge ${rashieBlock[surfer.colour]}`} aria-label={`${rashieLabel[surfer.colour]} rashie`} />
                  <span className="flex-1 font-display text-lg font-bold [font-variation-settings:'wdth'_108]">{surfer.name}</span>
                  <span className="font-display text-xl font-extrabold">{formatScore(surfer.score)}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className={`${panel} overflow-x-auto`}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className={`${panelTitle} text-2xl sm:text-3xl`}>Leaderboard</h2>
            <p className={mono}>best 2 waves per heat · judges averaged · rounds added up</p>
          </div>
          <Leaderboard rows={data.leaderboard} rounds={data.rounds} publicView />
        </section>

        {results.length > 0 && (
          <section className="grid gap-3">
            <h2 className={`${panelTitle} text-2xl`}>Heat by heat</h2>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {results.map((heat) => (
                <li key={heat.id} className="rounded-card border-2 border-edge bg-surface p-4">
                  <p className="font-display font-bold [font-variation-settings:'wdth'_108]">{heat.label}</p>
                  <ol className="mt-2 grid gap-1 text-sm">
                    {[...heat.surfers].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).map((surfer) => (
                      <li key={surfer.colour} className="flex items-center gap-2">
                        <span className={`h-3.5 w-3.5 rounded-full border border-edge ${rashieBlock[surfer.colour]}`} aria-label={rashieLabel[surfer.colour]} />
                        <span className="flex-1">{surfer.name}</span>
                        <span className="font-mono">{formatScore(surfer.score)}</span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
