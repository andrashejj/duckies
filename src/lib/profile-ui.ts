import { cn } from "./cn";
import { memberForm } from "./members-ui";

// The family's own page. A duckie is shown as a club pass — punched at the
// top, banded down one side, stamped with where they stand and torn off into
// a stub — and what's coming up rides on a rail of tickets. Recipe strings
// only: every colour here is a semantic token from global.css.

export const profileShell = "mx-auto max-w-6xl px-6 pb-24 pt-12 lg:px-10 lg:pt-16";
export const profileSection = "mt-14 first:mt-0";

// Status, in three shades, used by both the stamps and the pass bands.
export type Standing = "ok" | "pending" | "alert";
export const standingBand: Record<Standing, string> = {
  ok: "bg-teal-500",
  pending: "bg-sun-500",
  alert: "bg-coral-500",
};
export const standingText: Record<Standing, string> = {
  ok: "text-ok",
  pending: "text-caution",
  alert: "text-alert",
};
// A rubber stamp, knocked off square the way a real one lands.
export const stamp = (standing: Standing, className?: string) =>
  cn(
    "inline-flex -rotate-3 items-center gap-1.5 rounded-[0.45rem] border-[3px] border-double px-2.5 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-[0.16em]",
    standingText[standing],
    { ok: "border-ok", pending: "border-caution", alert: "border-alert" }[standing],
    className,
  );

export const passGrid = "grid gap-7 md:grid-cols-2";
export const passCard =
  "relative isolate overflow-hidden rounded-card border-2 border-edge bg-surface pl-3.5 shadow-sticker transition-[translate,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-sticker-xl motion-safe:animate-crew-arrive";
export const passBand = (standing: Standing) =>
  cn("absolute inset-y-0 left-0 w-3.5 border-r-2 border-edge", standingBand[standing]);
export const passPunch = "mx-auto mb-1 mt-4 h-2.5 w-16 rounded-full border-2 border-edge bg-canvas";
export const passHead = "flex items-start gap-4 px-5 pb-4 pt-2";
export const passPhoto = "h-20 w-20 shrink-0 rounded-[1rem] border-2 border-edge object-cover shadow-sticker-xs";
export const passPhotoEmpty = cn(passPhoto, "grid place-items-center bg-sun-500 font-brand text-[2rem] leading-none text-ink-950");
export const passName = "font-display text-[1.6rem] font-bold leading-[1.05] tracking-[-0.03em] text-fg [font-variation-settings:'wdth'_112]";
export const passMeta = "mt-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-fg/60";
// The tear-off stub: this term's standing, on a dashed perforation.
export const passStub =
  "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t-2 border-dashed border-line bg-canvas/60 px-5 py-3 font-mono text-[0.66rem] uppercase tracking-[0.14em]";
export const passBody = "border-t-2 border-dashed border-line px-5 py-4";
export const passSummary =
  "flex cursor-pointer list-none items-center justify-between gap-3 border-t-2 border-dashed border-line px-5 py-3 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-accent-text hover:bg-highlight/16 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-teal-600 [&::-webkit-details-marker]:hidden";
export const passChevron = "text-[1.1rem] leading-none transition-transform group-open:rotate-90 motion-reduce:transition-none";

export const factList =
  "grid gap-x-6 gap-y-4 sm:grid-cols-2 [&_dt]:font-mono [&_dt]:text-[0.6rem] [&_dt]:uppercase [&_dt]:tracking-[0.16em] [&_dt]:text-fg/55 [&_dd]:mt-1 [&_dd]:text-[0.92rem] [&_dd]:leading-[1.55] [&_dd]:break-words [&_dd]:whitespace-pre-line";
export const logList = "mt-3 space-y-2 border-l-2 border-dashed border-line pl-4 text-[0.85rem] leading-[1.55]";
export const logRow = "relative before:absolute before:-left-[1.3rem] before:top-2 before:h-2 before:w-2 before:rounded-full before:border-2 before:border-edge before:bg-highlight before:content-['']";
export const logWhen = "font-mono text-[0.6rem] uppercase tracking-[0.16em] text-fg/55";

// What's next, as a rail of torn tickets.
export const ticketRail = "-mx-6 mt-6 flex snap-x gap-4 overflow-x-auto px-6 pb-4 lg:mx-0 lg:px-0";
export const ticketAccents = ["bg-sticker-teal", "bg-sticker-sun", "bg-sticker-pink", "bg-sticker-lilac", "bg-sticker-coral"] as const;
export const ticketLink = "mt-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-fg underline underline-offset-4";
export const ticket =
  "relative flex min-w-[15.5rem] shrink-0 snap-start flex-col gap-1 rounded-card border-2 border-edge p-4 shadow-sticker-sm before:absolute before:-left-[0.6rem] before:top-1/2 before:h-4 before:w-4 before:-translate-y-1/2 before:rounded-full before:border-2 before:border-edge before:bg-canvas before:content-[''] after:absolute after:-right-[0.6rem] after:top-1/2 after:h-4 after:w-4 after:-translate-y-1/2 after:rounded-full after:border-2 after:border-edge after:bg-canvas after:content-['']";
// The sticker tints follow the theme, so the type on them stays semantic.
export const ticketWhen = "font-mono text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-fg/70";
export const ticketTitle = "font-display text-[1.15rem] font-bold leading-tight text-fg [font-variation-settings:'wdth'_110]";
export const ticketDetail = "text-[0.82rem] leading-[1.5] text-fg-muted";

// Inline editors. The member form recipe carries the field styling; these add
// the tuck-away panel a pass opens into.
export const editPanel = cn(memberForm, "mt-4 rounded-xl border-2 border-dashed border-edge p-4 text-[0.9rem]");
export const editRow = "flex flex-wrap items-center gap-x-5 gap-y-2";
export const noteCopy = "text-[0.85rem] leading-[1.6] text-fg-muted";
export const profileStatus = "mt-3 text-[0.9rem] leading-[1.6] not-empty:rounded-xl not-empty:border-2 not-empty:border-edge not-empty:bg-sticker-teal not-empty:px-4 not-empty:py-3";
