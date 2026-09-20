import { useEffect, useRef, useState } from "react";
import { heatClockLabel, heatLabel, heatSecondsLeft, type Heat } from "../../lib/comp";

type TimedHeat = Pick<Heat, "id" | "stage" | "round" | "number" | "status" | "endsAt">;

// Anchor to server time, then advance monotonically even if the phone clock changes.
export function useCompetitionClock(serverNow?: string) {
  const anchor = useRef({ server: Date.now(), local: performance.now() });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (serverNow) anchor.current = { server: Date.parse(serverNow), local: performance.now() };
    const tick = () => setNow(anchor.current.server + performance.now() - anchor.current.local);
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [serverNow]);
  return now;
}

export function HeatCountdown({ heat, now }: { heat: Pick<Heat, "status" | "endsAt">; now: number }) {
  const seconds = heatSecondsLeft(heat, now);
  return <span role="timer" aria-label="Heat time remaining" className={`font-mono text-xl font-semibold tabular-nums ${seconds <= 60 ? "text-coral-500" : "text-accent-text"}`}>{seconds ? `${heatClockLabel(seconds)} left` : "Scoring closed"}</span>;
}

export function HeatWarnings({ heats, now }: { heats: TimedHeat[]; now: number }) {
  const stages = useRef(new Map<string, number>());
  const [alerts, setAlerts] = useState<{ key: string; message: string; until: number }[]>([]);
  useEffect(() => {
    const fresh: { key: string; message: string; until: number }[] = [];
    for (const heat of heats) {
      if (!heat.endsAt) continue;
      const key = `${heat.id}:${heat.endsAt}`;
      if (heat.status !== "running" && !stages.current.has(key)) continue;
      const seconds = heatSecondsLeft(heat, now);
      const stage = seconds === 0 ? 3 : seconds <= 30 ? 2 : seconds <= 60 ? 1 : 0;
      const previous = stages.current.get(key) ?? 0;
      stages.current.set(key, stage);
      if (stage <= previous) continue;
      fresh.push({ key: `${key}:${stage}`, message: `${heatLabel(heat)} · ${stage === 3 ? "Time is up. Scoring is closed." : stage === 2 ? "30 seconds remaining" : "1 minute remaining"}`, until: now + 8000 });
    }
    if (fresh.length) setAlerts((old) => [...old.filter((alert) => alert.until > now), ...fresh]);
  }, [heats, now]);
  const visible = alerts.filter((alert) => alert.until > now);
  if (!visible.length) return null;
  return <div className="fixed inset-x-4 bottom-6 z-50 mx-auto grid max-w-lg gap-2" role="alert" aria-live="assertive">
    {visible.map((alert) => <p key={alert.key} className="rounded-xl border-2 border-edge bg-sticker-sun p-4 font-bold text-fg shadow-sticker-md">{alert.message}</p>)}
  </div>;
}
