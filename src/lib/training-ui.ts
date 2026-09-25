import { cn } from "./cn";
import type { RollStatus } from "./club-points";

// Utility recipes for training in the club (/members/training), in the members
// area's journal dress (see cup-members-ui.ts): hairline borders, no stickers.
// Here is the water (teal), away is the sand (coral); text on them uses the
// text-safe status tokens.

export const statusKey = (status: RollStatus) => status ?? "todo";

export const button = "inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-surface-2 px-4 text-[13px] font-semibold text-fg transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50";
export const primaryButton = cn(button, "bg-accent text-accent-fg");
export const textButton = "min-h-10 cursor-pointer rounded-lg px-2 text-[13px] font-semibold text-fg-muted transition hover:text-fg disabled:cursor-not-allowed disabled:opacity-40";
export const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-fg placeholder:text-fg-muted sm:text-[14px] disabled:opacity-50";
export const fieldLabel = "grid min-w-0 gap-1.5 text-[13px] font-semibold text-fg";

// Choosing the training
export const dayTab = "inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-semibold whitespace-nowrap text-fg-muted transition hover:text-fg aria-pressed:border-fg aria-pressed:text-fg disabled:cursor-not-allowed disabled:opacity-50";
export const dayCount = "text-[11px] font-normal text-fg-muted";
export const dayPicker = "min-h-10 shrink-0 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-fg disabled:opacity-50";

// The lineup bar: one segment per duckie, filling in as the roll is called.
export const lineupBar = "flex h-2 gap-[2px] overflow-hidden rounded-full";
export const lineupDot: Record<"here" | "away" | "todo", string> = {
  here: "min-w-[2px] flex-1 rounded-full bg-teal-500 transition-colors duration-300",
  away: "min-w-[2px] flex-1 rounded-full bg-coral-500 transition-colors duration-300",
  todo: "min-w-[2px] flex-1 rounded-full bg-line transition-colors duration-300",
};
export const segmented = "inline-grid grid-cols-2 rounded-lg bg-surface-2 p-0.5";
export const segment = "min-h-9 cursor-pointer rounded-md px-3.5 text-[13px] font-semibold text-fg-muted transition aria-pressed:bg-surface aria-pressed:text-fg aria-pressed:ring-1 aria-pressed:ring-line";

// One by one: the duckie being called.
export const callCard = "flex flex-col items-center gap-3 rounded-xl border border-line bg-surface px-4 pt-4 pb-4 text-center sm:px-8 sm:pt-5";
export const callPhoto = "h-24 w-24 shrink-0 rounded-full object-cover sm:h-32 sm:w-32";
export const callPhotoEmpty = cn(callPhoto, "grid place-items-center bg-surface-2 text-4xl font-semibold text-fg");
export const callName = "text-[28px] font-[650] leading-tight tracking-[-0.03em] break-words text-fg sm:text-[34px]";
export const firstTag = "rounded bg-sun-500 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.06em] uppercase text-ink-950";
const bigButton = "flex min-h-16 cursor-pointer flex-col items-center justify-center rounded-xl text-[20px] font-[650] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
export const hereButton = cn(bigButton, "bg-teal-500 text-ink-950 hover:brightness-95 aria-pressed:ring-2 aria-pressed:ring-teal-500 aria-pressed:ring-offset-2 aria-pressed:ring-offset-surface");
export const awayButton = cn(bigButton, "border border-line bg-surface text-fg hover:bg-surface-2 aria-pressed:border-coral-500 aria-pressed:bg-coral-500 aria-pressed:text-ink-950");
export const buttonNote = "mt-1 text-[11px] font-medium opacity-75";
export const pointsGiven = "text-[56px] leading-none font-[650] tracking-[-0.04em] text-fg tabular-nums";

// Whole crew: every duckie at once, tap as they arrive.
export const crewGrid = "grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4";
export const crewTile = "flex min-h-28 w-full cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
export const crewTone: Record<"here" | "away" | "todo", string> = {
  here: "border-teal-500 bg-teal-500/10",
  away: "border-coral-500/50 bg-coral-500/[0.06]",
  todo: "border-line bg-surface hover:bg-surface-2",
};
export const crewMark: Record<"here" | "away" | "todo", string> = {
  here: "text-[12px] font-semibold text-ok",
  away: "text-[12px] font-semibold text-alert",
  todo: "text-[12px] text-fg-muted",
};
export const face = "h-14 w-14 shrink-0 rounded-full object-cover";
export const faceEmpty = cn(face, "grid place-items-center bg-surface-2 text-xl font-semibold text-fg");
export const smallFace = "h-9 w-9 shrink-0 rounded-full object-cover";
export const smallFaceEmpty = cn(smallFace, "grid place-items-center bg-surface-2 text-[14px] font-semibold text-fg");
export const hereChip = "inline-flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 text-[13px] font-semibold data-[mine=true]:border-accent";

// Leaderboard
export const boardRow = "flex items-center gap-3 border-b border-line py-2.5 last:border-b-0";
export const rank = "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-semibold tabular-nums text-fg-muted";
export const podium: Record<number, string> = { 1: "bg-sun-500 text-ink-950", 2: "bg-surface-2 text-fg", 3: "bg-coral-500/15 text-fg" };
export const boardPoints = "ml-auto shrink-0 text-right text-[15px] font-[650] tabular-nums text-fg";
