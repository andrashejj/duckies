import { z } from 'zod';
import { drawRound, heatSizes, heatLabel, type CupConfig, type Entrant, type Heat, type Slot, type Standing } from './comp';

import { type CupPlan } from "./cup-plan-config";
export { cupPlanSchema, DEFAULT_CUP_PLAN, cupTime, type CupPlan } from "./cup-plan-config";

export type TimetableRow = { key: string; stage: 'round' | 'final'; round: number; number: number; label: string; start: string; end: string; heatId: string | null; slots: Slot[]; status: Heat['status'] | 'pending' };

/** Reserve every round before drawing it. Finals run lowest group first, Cup final last.
 * Times after a started heat follow its real clock. A final changeover remains a buffer.
 */
export function cupTimetable(config: Pick<CupConfig, 'rounds' | 'heatSize' | 'finalSize' | 'plan'>, count: number, heats: Heat[]) {
  if (!config.plan) return null;
  const plan = config.plan;
  let cursor = Date.parse(plan.start);
  const rows: TimetableRow[] = [];
  for (let round = 1; round <= config.rounds + 1; round++) {
    const stage = round > config.rounds ? 'final' : 'round';
    const size = stage === 'final' ? config.finalSize : config.heatSize;
    const numbers = Array.from({ length: Math.ceil(count / size) }, (_, i) => i + 1);
    if (stage === 'final') numbers.reverse();
    if (round > 1 && count) cursor += plan.regroupMinutes * 60000;
    for (const number of numbers) {
      const position = { stage, round: stage === 'final' ? 0 : round, number } as const;
      const heat = heats.find(h => h.stage === stage && h.round === position.round && h.number === number);
      const start = heat?.startedAt ? Date.parse(heat.startedAt) : cursor;
      const end = heat?.finishedAt ? Date.parse(heat.finishedAt) : heat?.endsAt ? Date.parse(heat.endsAt) : start + (heat?.durationMinutes ?? plan.heatMinutes) * 60000;
      rows.push({ ...position, key: `${stage}-${position.round}-${number}`, label: heatLabel(position), start: new Date(start).toISOString(), end: new Date(end).toISOString(), heatId: heat?.id ?? null, slots: heat?.slots ?? [], status: heat?.status ?? 'pending' });
      cursor = Math.max(cursor, end) + plan.changeoverMinutes * 60000;
    }
  }
  return { rows, finish: new Date(cursor).toISOString(), spareMinutes: Math.floor((Date.parse(plan.end) - cursor) / 60000) };
}

/** Multiple candidates minimise repeat pairings; seeded rounds only mix within
 * adjacent score bands of two heats, keeping the stronger half together.
 */
export function progressiveDraw(entrants: Entrant[], round: number, previous: Heat[], ranking: Standing[], plan: CupPlan, random: () => number = Math.random): Slot[][] {
  const ordered = round > plan.seedAfter ? ranking.map(row => entrants.find(k => k.id === row.kidId)!).filter(Boolean) : entrants;
  const bands: Entrant[][] = [];
  if (round <= plan.seedAfter) bands.push(ordered);
  else {
    const sizes = heatSizes(ordered.length, 4);
    let cursor = 0;
    for (let i = 0; i < sizes.length;) { const width = sizes.length <= 2 || (i === 0 && sizes.length % 2 === 1) ? 1 : 2; const count = sizes.slice(i, i + width).reduce((sum, n) => sum + n, 0); bands.push(ordered.slice(cursor, cursor += count)); i += width; }
  }
  const pairs = new Map<string, number>();
  const pairKey = (a: string, b: string) => [a, b].sort().join(':');
  for (const heat of previous) for (let i = 0; i < heat.slots.length; i++) for (const other of heat.slots.slice(i + 1)) {
    const key = pairKey(heat.slots[i].kidId, other.kidId); pairs.set(key, (pairs.get(key) ?? 0) + 1);
  }
  return bands.flatMap(band => {
    let best: Slot[][] = [], bestCost = Infinity;
    for (let attempt = 0; attempt < 100; attempt++) {
      // The existing later-round draw shuffles and rotates rashies.
      const candidate = drawRound(band, 2, 4, previous, random);
      let cost = 0;
      for (const heat of candidate) for (let i = 0; i < heat.length; i++) for (const other of heat.slice(i + 1)) cost += pairs.get(pairKey(heat[i].kidId, other.kidId)) ?? 0;
      if (cost < bestCost) { best = candidate; bestCost = cost; }
      if (!cost) break;
    }
    return best;
  });
}

/** Refuse progression until every entrant has one completed heat in each round. */
export function roundReadiness(entrants: Entrant[], heats: Heat[], through: number): string | null {
  for (let round = 1; round <= through; round++) {
    const group = heats.filter(h => h.stage === 'round' && h.round === round);
    if (!group.length || group.some(h => h.status !== 'done')) return `Finish every heat in round ${round} first.`;
    for (const kid of entrants) if (group.flatMap(h => h.slots).filter(s => s.kidId === kid.id).length !== 1) return `${kid.name} needs exactly one heat in round ${round}. Restore the draw before continuing.`;
  }
  return null;
}
export const boundaryTies = (rows: Standing[], size = 4) => rows.filter((row, i) => i > 0 && i % size === 0 && rows[i - 1].rank === row.rank).map(row => row.rank);
export const finalReviewSchema = z.object({ order: z.array(z.uuid()).min(1).max(200), reason: z.string().trim().min(10).max(500) }).strict();
