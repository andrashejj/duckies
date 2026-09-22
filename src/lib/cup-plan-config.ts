import { z } from "zod";

export const cupPlanSchema = z.object({
  start: z.iso.datetime({ offset: true }),
  end: z.iso.datetime({ offset: true }),
  heatMinutes: z.int().min(5).max(30),
  changeoverMinutes: z.int().min(1).max(10),
  regroupMinutes: z.int().min(3).max(15),
  seedAfter: z.union([z.literal(1), z.literal(2)]),
}).strict().refine(p => Date.parse(p.end) > Date.parse(p.start) && Date.parse(p.end) - Date.parse(p.start) <= 12 * 3600000, 'Choose an end time after the start, within the same day.');
export type CupPlan = z.infer<typeof cupPlanSchema>;
export const DEFAULT_CUP_PLAN: CupPlan = { start: '2026-10-16T15:00:00+04:00', end: '2026-10-16T17:30:00+04:00', heatMinutes: 8, changeoverMinutes: 2, regroupMinutes: 5, seedAfter: 2 };
export const cupTime = (value: string) => new Date(value).toLocaleTimeString('en-GB', { timeZone: 'Indian/Mauritius', hour: '2-digit', minute: '2-digit' });
