import { useEffect, useState } from "react";
import { rashieLabel, type Rashie } from "../../lib/comp";
import { rashieBlock } from "../../lib/comp-ui";
import { cn } from "../../lib/cn";
import { lineupAccents, lineupBadge, lineupBand, lineupCard, lineupGhost, lineupGrid, lineupInitial, lineupName, lineupNumber, lineupTag } from "../../lib/cup-ui";

// The Cup's lineup: one athlete card per registered surfer, in sign-up order,
// straight from the registrations. Refetches when the form on the same page
// locks someone in (it fires "cup:lineup"), so your card shows up right away.
type Surfer = { number: number; name: string; age: number | null; wildcard: boolean; heat: { label: string; colour: Rashie } | null };
type Lineup = { name: string; surfers: Surfer[] };

const pad = (n: number) => String(n).padStart(2, "0");
const split = (name: string) => { const i = name.lastIndexOf(" "); return i > 0 ? [name.slice(0, i), name.slice(i + 1)] : [name, ""]; };

export default function CupLineup({ registerHref = "#register" }: { registerHref?: string }) {
  const [data, setData] = useState<Lineup | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch("/api/cup/lineup", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const next: Lineup = await response.json();
        if (alive) { setData(next); setFailed(false); }
      } catch { if (alive) setFailed(true); }
    }
    void load();
    const refresh = () => void load();
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("cup:lineup", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => { alive = false; window.removeEventListener("cup:lineup", refresh); document.removeEventListener("visibilitychange", visible); };
  }, []);

  if (!data) return <p className="py-10 text-center font-mono text-[0.72rem] uppercase tracking-[0.2em] text-cream/70">{failed ? "The lineup is taking a breather. Hang on…" : "Checking the list…"}</p>;

  const count = data.surfers.length;
  return (
    <div className="grid gap-8" data-lineup>
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.22em] text-cream/75" data-lineup-count>
        {count === 0 ? "Nobody's locked in yet — first name on the board?" : `${count} ${count === 1 ? "surfer" : "surfers"} locked in · spots open until the day`}
      </p>
      <ul className={lineupGrid}>
        {data.surfers.map((surfer, index) => {
          const accent = lineupAccents[index % lineupAccents.length];
          const [first, last] = split(surfer.name);
          return (
            <li key={surfer.number} className={cn(lineupCard, accent.shadow)} style={{ animationDelay: `${Math.min(index, 12) * 70}ms` }} data-lineup-card>
              <span className={cn(lineupBand, accent.band)} aria-hidden="true" />
              <span className={lineupNumber} aria-hidden="true">{pad(surfer.number)}</span>
              <div className="flex items-start justify-between gap-2">
                <span className={lineupTag}>No. {pad(surfer.number)}</span>
                <span className={cn(lineupBadge, surfer.wildcard ? "bg-cream" : accent.badge)}>{surfer.wildcard ? "Wildcard" : "Duckie"}</span>
              </div>
              <div className="flex flex-1 items-center justify-center py-2" aria-hidden="true">
                <span className={lineupInitial}>{first[0]?.toUpperCase() ?? "?"}</span>
              </div>
              <div className="grid gap-2">
                <p className={lineupName}>
                  {first}
                  {last && <span className={cn("font-accent font-medium italic", accent.initial)}> {last}</span>}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={lineupTag}>{surfer.age === null ? "Age tbc" : `Age ${surfer.age}`}</span>
                  <span className={lineupTag}>Tamarin Bay</span>
                </div>
                {surfer.heat && (
                  <span className={cn("inline-flex w-fit items-center gap-1.5 rounded-full border-[1.5px] border-ink-950 px-2.5 py-1 font-mono text-[0.55rem] font-bold uppercase tracking-[0.16em]", rashieBlock[surfer.heat.colour])}>
                    {surfer.heat.label} · {rashieLabel[surfer.heat.colour]}
                  </span>
                )}
              </div>
            </li>
          );
        })}
        <li style={{ animationDelay: `${Math.min(count, 12) * 70 + 70}ms` }}>
          <a href={registerHref} className={lineupGhost} data-lineup-you>
            <span className="font-brand text-[3.5rem] leading-none text-cream/40" aria-hidden="true">{pad(count + 1)}</span>
            <span className="font-display text-lg font-bold leading-tight [font-variation-settings:'wdth'_112]">Your name here</span>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-cream/70">Register →</span>
          </a>
        </li>
      </ul>
    </div>
  );
}
