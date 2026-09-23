import type { Rashie } from "./comp";
import { cn } from "./cn";

// Utility recipes for cup day: the organiser board (/admin/cup), the judge
// sheet (/cup/judge) and the public live leaderboard. Colours are semantic
// tokens from global.css; the four rashies are brand constants.

export const rashieBlock: Record<Rashie, string> = {
  red: "bg-rashie-red text-cream-soft",
  yellow: "bg-rashie-yellow text-ink-950",
  blue: "bg-rashie-blue text-cream-soft",
  green: "bg-rashie-green text-ink-950",
};
export const rashieSwatch = (colour: Rashie, className?: string) =>
  cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-edge font-mono text-[0.6rem] font-bold uppercase", rashieBlock[colour], className);

export const statusPill: Record<"scheduled" | "running" | "done", string> = {
  scheduled: "border-line bg-surface text-fg-muted",
  running: "border-coral-500 bg-coral-500 text-ink-950 motion-safe:animate-live-pulse",
  done: "border-edge bg-highlight text-highlight-fg",
};
export const pill = "inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-1 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.14em]";

// Club access on the parents directory. Approved membership is the organiser's
// manual tick; a guardian without it still reaches their own family.
export const accessPill: Record<"organiser" | "member" | "family" | "none", string> = {
  organiser: "border-edge bg-accent text-accent-fg",
  member: "border-teal-500 bg-sticker-teal text-fg",
  family: "border-line bg-surface text-fg-muted",
  none: "border-line bg-surface text-fg-muted",
};
export const accessLabel: Record<"organiser" | "member" | "family" | "none", string> = {
  organiser: "Organiser",
  member: "Club member",
  family: "Family access",
  none: "No access yet",
};

export const panel = "rounded-sticker border-2 border-edge bg-surface p-5 shadow-sticker-sm sm:p-6";
export const panelTitle = "font-display text-xl font-bold leading-tight text-fg [font-variation-settings:'wdth'_110] sm:text-2xl";
export const mono = "font-mono text-[0.66rem] uppercase tracking-[0.16em] text-fg/65";
export const monoPlain = "font-mono text-[0.7rem] text-fg/65";
export const select = "min-h-10 rounded-xl border-2 border-edge bg-surface px-3 py-1.5 text-sm text-fg outline-none focus-visible:ring-4 focus-visible:ring-accent/40 disabled:opacity-50";
export const input = "min-h-10 w-full rounded-xl border-2 border-edge bg-surface px-3 py-1.5 text-sm text-fg outline-none placeholder:text-fg/45 focus-visible:ring-4 focus-visible:ring-accent/40";
export const smallButton = "inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-full border-2 border-edge bg-surface px-3 py-1 font-display text-[0.8rem] font-bold text-fg transition hover:bg-highlight hover:text-highlight-fg disabled:cursor-not-allowed disabled:opacity-50 [font-variation-settings:'wdth'_108]";
export const dangerButton = cn(smallButton, "hover:bg-coral-500 hover:text-ink-950");
export const primaryButton = cn(smallButton, "bg-accent text-accent-fg shadow-sticker-xs hover:-translate-x-px hover:-translate-y-px hover:shadow-sticker-sm");
export const linkButton = "cursor-pointer font-mono text-[0.66rem] uppercase tracking-[0.14em] text-fg/70 underline underline-offset-4 hover:text-accent-text disabled:opacity-50";
export const notice = "rounded-xl border-2 border-edge bg-sticker-sun px-4 py-3 text-sm text-fg";
export const errorNotice = "rounded-xl border-2 border-coral-500 bg-sticker-coral px-4 py-3 text-sm text-fg";

// Heat cards on the organiser board
export const heatCard = "flex flex-col gap-3 rounded-card border-2 border-edge bg-surface p-4 shadow-sticker-sm transition-[box-shadow,translate] data-[drop=true]:-translate-y-0.5 data-[drop=true]:bg-sticker-teal data-[drop=true]:shadow-sticker-md";
export const slotRow = "flex items-center gap-3 rounded-xl border border-line bg-canvas px-2 py-2 data-[dragging=true]:opacity-40";
export const avatar = "h-9 w-9 shrink-0 rounded-full border border-edge object-cover";
export const avatarEmpty = cn(avatar, "grid place-items-center bg-highlight font-display text-[1.05rem] text-highlight-fg");

// Judge sheet
export const surferCard = "overflow-hidden rounded-sticker border-2 border-edge bg-surface shadow-sticker-md";
export const surferBand = "flex items-center gap-4 px-4 py-3";
export const judgeAvatar = "h-16 w-16 shrink-0 rounded-full border-2 border-edge bg-surface object-cover sm:h-20 sm:w-20";
export const judgeAvatarEmpty = cn(judgeAvatar, "grid place-items-center font-display text-3xl text-fg");
export const waveChip = "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border-2 border-edge bg-surface px-3 font-display text-[1rem] font-bold text-fg transition hover:bg-highlight hover:text-highlight-fg aria-pressed:bg-accent aria-pressed:text-accent-fg";
export const waveChipBest = "border-teal-500 bg-sticker-teal";
export const scorePad = "grid grid-cols-5 gap-2";
export const scoreKey = "min-h-12 cursor-pointer rounded-xl border-2 border-edge bg-surface font-display text-[1.1rem] font-bold text-fg shadow-sticker-xs transition active:translate-x-px active:translate-y-px active:shadow-none hover:bg-highlight hover:text-highlight-fg disabled:cursor-wait disabled:opacity-50 [font-variation-settings:'wdth'_112]";
export const heatTab = "inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border-2 border-edge bg-surface px-4 font-display text-[0.9rem] font-bold text-fg transition hover:bg-highlight hover:text-highlight-fg aria-selected:bg-accent aria-selected:text-accent-fg [font-variation-settings:'wdth'_108]";

// Public live page
export const liveTicker = "inline-flex animate-ticker gap-12 whitespace-nowrap pr-12 font-display text-[1.05rem] font-bold uppercase tracking-[-0.01em] [font-variation-settings:'wdth'_108] motion-reduce:animate-none [&_span]:inline-flex [&_span]:items-center [&_span]:gap-12 [&_i]:not-italic [&_i]:text-coral-400";
export const boardTable = "w-full border-collapse text-left text-sm [&_th]:border-b-2 [&_th]:border-edge [&_th]:px-2 [&_th]:py-2 [&_th]:font-mono [&_th]:text-[0.62rem] [&_th]:uppercase [&_th]:tracking-[0.16em] [&_th]:text-fg/65 [&_td]:border-b [&_td]:border-line [&_td]:px-2 [&_td]:py-2.5 [&_td]:align-middle";
export const rankBubble = "inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-edge bg-surface font-display text-[0.95rem] font-extrabold text-fg [font-variation-settings:'wdth'_112]";
export const podium: Record<number, string> = { 1: "bg-sun-500 text-ink-950", 2: "bg-cream-deep text-ink-950", 3: "bg-sticker-coral" };
