import { cn } from "./cn";

// Utility recipes for the members' cup board (/members/cup): the organiser
// board's pieces in the members area's quieter journal dress — hairline
// borders, no stickers, the journal accent for what is yours.
export const card = "rounded-xl border border-line bg-surface p-5 sm:p-6";
export const cardTitle = "text-[17px] font-[650] leading-tight text-fg";
export const cardLead = "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1";
export const eyebrow = "font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted";
export const muted = "text-[13px] leading-relaxed text-fg-muted";
export const link = "inline-flex min-h-11 items-center text-[13px] font-semibold underline underline-offset-4 hover:text-accent-text";
export const tab = "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3.5 text-[13px] font-semibold text-fg-muted transition hover:text-fg aria-selected:bg-surface-2 aria-selected:text-fg";
export const heatCard = "flex flex-col gap-3 rounded-xl border border-line bg-surface p-4";
export const slotRow = "flex items-center gap-3 rounded-lg border border-line bg-canvas px-2.5 py-2 data-[mine=true]:border-accent";
export const kidChip = "flex min-w-0 items-center gap-2.5 rounded-lg border border-line px-2.5 py-2 data-[mine=true]:border-accent";
export const avatar = "h-9 w-9 shrink-0 rounded-full border border-line object-cover";
export const avatarEmpty = cn(avatar, "grid place-items-center bg-surface-2 text-[15px] font-semibold text-fg");
export const mineTag = "rounded bg-accent px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-[0.06em] text-accent-fg";
export const dot = "inline-block h-2.5 w-2.5 shrink-0 rounded-full";
export const timetableRow = "grid gap-1 border-b border-line py-3 last:border-b-0 sm:grid-cols-[7rem_11rem_1fr] sm:gap-3";
export const select = "min-h-11 rounded-lg border border-line bg-surface px-3 text-[14px] text-fg";
