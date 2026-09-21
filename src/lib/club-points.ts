export type PointActivity = { kind: "training" | "granola" | "cup"; sourceId: string; date: string; points: number; units: number };
export type KidPoints = { total: number; training: number; granola: number; cup: number; activities: PointActivity[] };
export type PointRules = { training: number; granola: number; cup: number };
export type AttendanceKid = { id: string; name: string; guardians: string; photoVersion: string | null; present: boolean; points: KidPoints };
export type TrainingBoard = { date: string; today: string; sessionPoints: number; canEdit: boolean; rules: PointRules; kids: AttendanceKid[]; sessions: { date: string; present: number }[] };
export const emptyPoints = (): KidPoints => ({ total: 0, training: 0, granola: 0, cup: 0, activities: [] });
export function clubToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Indian/Mauritius", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function clubDayLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
export function activityLabel(activity: PointActivity) {
  return activity.kind === "training" ? "Training attended" : activity.kind === "cup" ? "Cup participation" : `${activity.units} granola ${activity.units === 1 ? "bag" : "bags"} · paid family order`;
}
