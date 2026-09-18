// Recipes for the cup page's signed-in kid list, built imperatively.
export const kidRow = "flex flex-wrap items-center gap-3 rounded-2xl border-2 border-edge bg-canvas px-4 py-3";
export const kidTag = "rounded-full border-[1.5px] border-edge bg-highlight px-3 py-1 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-highlight-fg";
export const kidButton = "ml-auto cursor-pointer rounded-full border-2 border-edge bg-accent px-4 py-2 font-display text-[0.8rem] font-bold uppercase tracking-[-0.01em] text-accent-fg shadow-sticker-sm transition hover:-translate-x-px hover:-translate-y-px disabled:cursor-default disabled:bg-surface disabled:text-fg/60 disabled:shadow-none";

// The lineup: athlete cards on the dark board, in brand colours that stay the
// same in both modes (the section is ink in light and dark alike, like the hero).
export const lineupGrid = "grid grid-cols-2 gap-5 sm:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5";
export const lineupCard = "group relative isolate flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-[1.4rem] border-2 border-ink-950 bg-cream p-4 text-ink-950 transition-[translate,rotate,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:animate-crew-arrive hover:-translate-y-1.5 hover:-rotate-1 sm:p-5";
export const lineupGhost = "flex aspect-[4/5] flex-col items-center justify-center gap-3 rounded-[1.4rem] border-2 border-dashed border-cream/50 p-4 text-center text-cream transition hover:border-cream hover:bg-cream/5 motion-safe:animate-crew-arrive";
// The diagonal band behind the initial: a different colour per card.
export const lineupBand = "pointer-events-none absolute -left-[30%] top-[38%] -z-10 h-[34%] w-[160%] -rotate-12";
export const lineupNumber = "pointer-events-none absolute -right-2 -top-3 -z-10 select-none font-brand text-[5.5rem] leading-none text-ink-950/8 sm:text-[6.5rem]";
export const lineupInitial = "font-brand text-[5rem] leading-none text-cream [text-shadow:4px_4px_0_var(--color-ink-950)] [-webkit-text-stroke:1.5px_var(--color-ink-950)] sm:text-[6rem]";
export const lineupTag = "whitespace-nowrap font-mono text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-ink-950/70";
export const lineupBadge = "rounded-full border-[1.5px] border-ink-950 px-2.5 py-1 font-mono text-[0.55rem] font-bold uppercase tracking-[0.16em] text-ink-950";
export const lineupName = "font-display text-[1.35rem] font-extrabold leading-[0.95] tracking-[-0.02em] [font-variation-settings:'wdth'_118] sm:text-[1.55rem]";
export const lineupAccents = [
  { band: "bg-coral-500", shadow: "shadow-[6px_6px_0_0_var(--color-coral-500)] hover:shadow-[10px_10px_0_0_var(--color-coral-500)]", initial: "text-coral-400", badge: "bg-coral-500" },
  { band: "bg-sun-500", shadow: "shadow-[6px_6px_0_0_var(--color-sun-500)] hover:shadow-[10px_10px_0_0_var(--color-sun-500)]", initial: "text-sun-500", badge: "bg-sun-500" },
  { band: "bg-teal-500", shadow: "shadow-[6px_6px_0_0_var(--color-teal-500)] hover:shadow-[10px_10px_0_0_var(--color-teal-500)]", initial: "text-teal-500", badge: "bg-teal-500" },
  { band: "bg-pink-400", shadow: "shadow-[6px_6px_0_0_var(--color-pink-400)] hover:shadow-[10px_10px_0_0_var(--color-pink-400)]", initial: "text-pink-400", badge: "bg-pink-400" },
  { band: "bg-lilac-400", shadow: "shadow-[6px_6px_0_0_var(--color-lilac-400)] hover:shadow-[10px_10px_0_0_var(--color-lilac-400)]", initial: "text-lilac-400", badge: "bg-lilac-400" },
] as const;
