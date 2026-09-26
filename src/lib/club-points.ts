// Sunset Duckies is the club's evening training, worth more; Sunrise Duckies
// is the early session alongside it. Both are "training" for points and
// leaderboard purposes; session_type only picks which roll is called.
export type SessionType = "sunset" | "sunrise";
export const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: "sunset", label: "Sunset Duckies" },
  { value: "sunrise", label: "Sunrise Duckies" },
];
export type PointActivity = { kind: "training" | "granola" | "cup"; sessionType: SessionType | null; sourceId: string; date: string; points: number; units: number };
export type KidPoints = { total: number; training: number; granola: number; cup: number; activities: PointActivity[] };
export type PointRules = { training: number; sunrise: number; granola: number; cup: number };
// Training in the club: every member sees who was in the water and the
// points leaderboard; organisers and the coaches they select call the roll.
// The leaderboard shows totals; only organisers see how a total is made up.
export type TrainingAccess = "organiser" | "coach" | "member";
export type RollStatus = "here" | "away" | null;
export type PointSplit = { training: number; granola: number; cup: number };
export type TrainingKid = { id: string; name: string; guardians: string; photoVersion: string | null; mine: boolean; status: RollStatus; trainings: number; points: number; split: PointSplit | null };
export type TrainingBoard = { date: string; sessionType: SessionType; today: string; sessionPoints: number; access: TrainingAccess; kids: TrainingKid[]; sessions: { date: string; present: number }[] };
export type Coach = { email: string; name: string; addedAt: string; addedBy: string; signedIn: boolean };
export const canCallRoll = (access: TrainingAccess) => access !== "member";
export const emptyPoints = (): KidPoints => ({ total: 0, training: 0, granola: 0, cup: 0, activities: [] });
export function clubToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Indian/Mauritius", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function clubDayLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
export function clubDayShort(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}
export function activityLabel(activity: PointActivity) {
  return activity.kind === "training" ? `${activity.sessionType === "sunrise" ? "Sunrise" : "Sunset"} Duckies attended`
    : activity.kind === "cup" ? "Cup participation" : `${activity.units} granola ${activity.units === 1 ? "bag" : "bags"} · family order`;
}
