import { cn } from "./cn";
import { memberForm } from "./members-ui";

// Shared styles for private family records and their inline editors.
export type Standing = "ok" | "pending" | "alert";
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

// Inline editors. The member form recipe carries the field styling; these add
// the tuck-away panel a pass opens into.
export const editPanel = cn(memberForm, "mt-4 rounded-xl border-2 border-dashed border-edge p-4 text-[0.9rem]");
export const editRow = "flex flex-wrap items-center gap-x-5 gap-y-2";
export const noteCopy = "text-[0.85rem] leading-[1.6] text-fg-muted";
export const profileStatus = "mt-3 text-[0.9rem] leading-[1.6] not-empty:rounded-xl not-empty:border-2 not-empty:border-edge not-empty:bg-sticker-teal not-empty:px-4 not-empty:py-3";
