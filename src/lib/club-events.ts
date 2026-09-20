import { site } from "../data/site";
import type { Semester } from "./registration/semesters";

// What is coming up for a family: the next training sessions from the club's
// weekly rhythm, the Cup, and the day the semester runs out. Dates are plain
// calendar days in Mauritius — the club never runs a session at midnight, so
// the day is all that matters and UTC arithmetic keeps it stable.

export type ClubEvent = {
  kind: "training" | "cup" | "semester";
  date: string;
  dayLabel: string;
  timeLabel: string;
  title: string;
  detail: string;
  href?: string;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const day = (date: Date) => date.toISOString().slice(0, 10);
const atUTC = (iso: string) => new Date(`${iso}T00:00:00Z`);
function formatDay(iso: string) {
  return atUTC(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

// The next `count` dates the club is in the water, from today forward.
function nextSessions(from: Date, count: number, until: string | null): ClubEvent[] {
  const sessions: ClubEvent[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  for (let step = 0; step < 90 && sessions.length < count; step++) {
    const iso = day(cursor);
    const slot = site.schedule.find((entry) => entry.day === WEEKDAYS[cursor.getUTCDay()]);
    if (slot && (!until || iso <= until))
      sessions.push({
        kind: "training",
        date: iso,
        dayLabel: formatDay(iso),
        timeLabel: slot.time,
        title: `${slot.day} training`,
        detail: slot.focus,
      });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return sessions;
}

export function upcomingEvents({ term, now = new Date(), sessions = 3 }: { term: Semester | null; now?: Date; sessions?: number }): ClubEvent[] {
  const today = day(now);
  const events: ClubEvent[] = nextSessions(now, sessions, term?.endsOn ?? null);
  const cup = site.cupVol2;
  if (cup.dateISO >= today)
    events.push({
      kind: "cup",
      date: cup.dateISO,
      dayLabel: formatDay(cup.dateISO),
      timeLabel: "From 12:00",
      title: `${cup.name} ${cup.edition}`,
      detail: "Heats, BBQ and a bonfire on the sand. Free for duckies.",
      href: "/sunset-duckies-cup-vol-2",
    });
  if (term?.endsOn && term.endsOn >= today)
    events.push({
      kind: "semester",
      date: term.endsOn,
      dayLabel: formatDay(term.endsOn),
      timeLabel: "Last day",
      title: `${term.label} ends`,
      detail: "The next semester's fee opens membership for the term after this one.",
    });
  return events.sort((a, b) => a.date.localeCompare(b.date));
}
