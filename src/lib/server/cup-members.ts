import { cupTimetable } from "../cup-planner";
import { heatResults, standings, type CupConfig, type HeatStatus, type Rashie, type Standing, type TickerItem } from "../comp";
import { CUP_LABEL, CUP_TERM } from "../registration/cup";
import { getAuth } from "./auth";
import { CompError, expireHeats, readConfig, readEntrants, readHeats, readJudges, readTicker, readVolunteers, readWaves, serverTime } from "./comp";
import { findMember, getDatabase } from "./db";
import { photoKids } from "./photo-profiles";

// The members' cup board (/members/cup): the same picture the organisers
// work from — the lineup, the draw, the heats, the judges, the scores and the
// timetable — with none of the controls and none of the contact details.
// Judges appear by name only; a photo shows only for the member's own
// duckies, through the family route that already guards it.

export type MemberAccess = { email: string; role: string };
export type MemberEntrant = { id: string; name: string; age: number | null; member: boolean; number: number; photo: string | null };
export type MemberHeat = {
  id: string; stage: "round" | "final"; round: number; number: number; status: HeatStatus; startedAt: string | null; finishedAt: string | null; endsAt: string | null; durationMinutes: number;
  judges: string[]; slots: { kidId: string; colour: Rashie; score: number | null; waves: number }[];
};
export type MemberCupState = {
  serverNow: string; name: string;
  config: Pick<CupConfig, "rounds" | "heatSize" | "finalSize" | "live" | "plan" | "finalReview">;
  entrants: MemberEntrant[]; heats: MemberHeat[]; judges: string[]; ticker: TickerItem[]; standings: Standing[];
  timetable: ReturnType<typeof cupTimetable>;
  me: { kids: string[]; judging: string[]; volunteering: { heatId: string; status: "pending" | "approved" | "declined" }[] };
};

/** A signed-in club member (or organiser). Family-only and judge-only sign-ins stay on the public pages. */
export async function memberAccess(request: Request): Promise<MemberAccess> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified) throw new CompError("Please sign in.", 401);
  const member = await findMember(session.user.email);
  if (!member) throw new CompError("The Cup board is for club members.", 403);
  return member;
}

export async function loadMemberCup(actor: MemberAccess, edition = CUP_TERM): Promise<MemberCupState> {
  await expireHeats(edition);
  const db = getDatabase();
  const [config, entrants, heats, judges, waves, ticker, order, kids, guardianOf, volunteering] = await Promise.all([
    readConfig(db, edition), readEntrants(db, edition), readHeats(db, edition), readJudges(db, edition), readWaves(db, edition), readTicker(db, edition),
    db.query<{ kid_id: string }>("SELECT kid_id FROM club_cup_entry WHERE edition=$1 ORDER BY created_at, kid_id", [edition]),
    photoKids(actor),
    db.query<{ kid_id: string }>("SELECT kid_id FROM club_current_guardian WHERE email=$1", [actor.email]),
    readVolunteers(db, edition, actor.email),
  ]);
  const numbers = new Map(order.rows.map((row, index) => [row.kid_id, index + 1]));
  const photos = new Map(kids.map((kid) => [kid.id, kid.profilePhoto]));
  const names = new Map(judges.map((judge) => [judge.email, judge.name]));
  return {
    serverNow: await serverTime(db), name: CUP_LABEL,
    config: { rounds: config.rounds, heatSize: config.heatSize, finalSize: config.finalSize, live: config.live, plan: config.plan, finalReview: config.finalReview },
    entrants: entrants
      .map((kid) => ({ id: kid.id, name: kid.name, age: kid.age, member: kid.member, number: numbers.get(kid.id) ?? 0, photo: photos.get(kid.id) ?? null }))
      .sort((a, b) => a.number - b.number),
    heats: heats.map((heat) => {
      const results = heatResults(heat, waves);
      return {
        id: heat.id, stage: heat.stage, round: heat.round, number: heat.number, status: heat.status, startedAt: heat.startedAt, finishedAt: heat.finishedAt, endsAt: heat.endsAt, durationMinutes: heat.durationMinutes,
        judges: heat.judges.map((email) => names.get(email)).filter((name): name is string => !!name),
        slots: heat.slots.map((slot) => ({ kidId: slot.kidId, colour: slot.colour, score: results.get(slot.kidId)?.score ?? null, waves: results.get(slot.kidId)?.waves ?? 0 })),
      };
    }),
    judges: judges.map((judge) => judge.name), ticker,
    standings: standings(config, entrants, heats, waves),
    timetable: cupTimetable(config, entrants.length, heats),
    me: {
      kids: guardianOf.rows.map((row) => row.kid_id).filter((id) => entrants.some((kid) => kid.id === id)),
      judging: heats.filter((heat) => heat.judges.includes(actor.email)).map((heat) => heat.id),
      volunteering: volunteering.map(({ heatId, status }) => ({ heatId, status })),
    },
  };
}
