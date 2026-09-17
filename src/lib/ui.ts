import { cn } from "./cn";

// Utility recipes shared by the Astro primitives (src/components/ui) and the
// React ones (src/components/react/ui.tsx) so both renderers stay identical.
// Colours are always semantic tokens from global.css.

export type CtaVariant = "primary" | "secondary" | "performance";
export type CtaSize = "md" | "sm";
export type Tone = "sticker" | "outline";
export type StickerTone = "coral" | "teal" | "sun" | "pink" | "lilac" | "none";

const ctaBase = "inline-flex items-center justify-center gap-[0.6rem] transition-[translate,box-shadow,background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed disabled:opacity-60";
const ctaVariants: Record<CtaVariant, string> = {
  primary: "relative rounded-full border-2 border-edge bg-accent font-display font-bold uppercase tracking-[-0.01em] text-accent-fg shadow-sticker-lg [font-variation-settings:'wdth'_108] after:font-mono after:text-[1.1em] after:transition-transform after:duration-200 after:content-['→'] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-highlight hover:text-highlight-fg hover:shadow-sticker-xl hover:after:translate-x-1 active:translate-x-0.5 active:translate-y-0.5 active:shadow-sticker-xs",
  secondary: "rounded-full border-2 border-edge bg-surface font-display font-bold uppercase tracking-[-0.01em] text-fg shadow-sticker-lg [font-variation-settings:'wdth'_108] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-teal-500 hover:text-ink-950 hover:shadow-sticker-xl active:translate-x-0.5 active:translate-y-0.5 active:shadow-sticker-xs",
  performance: "rounded-[0.35rem] border border-accent bg-accent font-mono font-semibold uppercase tracking-[0.08em] text-accent-fg hover:bg-fg hover:text-canvas",
};
const ctaSizes = (variant: CtaVariant): Record<CtaSize, string> => ({
  md: variant === "performance" ? "px-4 py-3 text-[0.72rem]" : variant === "secondary" ? "px-[1.6rem] py-[0.95rem] text-[0.92rem]" : "px-7 py-4 text-[0.95rem]",
  sm: "min-h-11 px-3 py-2 text-[0.7rem] sm:min-h-0 sm:px-5 sm:py-3 sm:text-[0.85rem]",
});
export const ctaClass = (variant: CtaVariant = "primary", size: CtaSize = "md", className?: string) =>
  cn(ctaBase, ctaVariants[variant], ctaSizes(variant)[size], className);

export const kickerClass = (tone: Tone = "sticker", className?: string) =>
  cn(
    "inline-flex items-center gap-2 rounded-full border-[1.5px] px-3 py-[0.35rem] font-mono text-[0.7rem] font-medium uppercase tracking-[0.24em] before:text-[0.85em]",
    tone === "sticker" ? "border-edge bg-highlight text-highlight-fg shadow-sticker-xs before:text-coral-500 before:content-['★']" : "border-line bg-transparent text-accent-text",
    className,
  );

export const chipClass = (tone: Tone = "sticker", className?: string) =>
  cn(
    "inline-flex items-center gap-[0.4rem] rounded-full border-[1.5px] px-[0.95rem] py-[0.45rem] font-mono text-[0.72rem] font-medium tracking-[0.03em]",
    tone === "sticker"
      ? "border-edge bg-surface text-fg shadow-sticker-xs transition-transform duration-200 before:text-[0.85em] before:text-coral-500 before:content-['✦'] hover:-translate-x-px hover:-translate-y-px"
      : "border-line bg-transparent text-accent-text",
    className,
  );

export const stickerTones: Record<StickerTone, string> = {
  none: "bg-surface", coral: "bg-sticker-coral", teal: "bg-sticker-teal", sun: "bg-sticker-sun", pink: "bg-sticker-pink", lilac: "bg-sticker-lilac",
};
export const stickerCardClass = ({ tone = "none", dashed = false, tilt, hover = true }: { tone?: StickerTone; dashed?: boolean; tilt?: "left" | "right"; hover?: boolean } = {}, className?: string) =>
  cn(
    "relative rounded-sticker border-2 border-edge shadow-sticker transition-[translate,rotate,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
    hover && "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-sticker-2xl",
    stickerTones[tone],
    dashed && "after:pointer-events-none after:absolute after:inset-[10px] after:rounded-[calc(var(--radius-sticker)-10px)] after:border-[1.5px] after:border-dashed after:border-fg/35 after:content-['']",
    tilt === "left" && "-rotate-[1.8deg] hover:rotate-0",
    tilt === "right" && "rotate-[1.6deg] hover:rotate-0",
    className,
  );

const titleSizes = { lg: "text-[clamp(2rem,4vw,3.6rem)]", md: "text-[clamp(1.7rem,3vw,2.6rem)]", sm: "text-[clamp(1.6rem,3vw,2.4rem)]", none: "" };
export const sectionTitleClass = (size: keyof typeof titleSizes = "lg", className?: string) =>
  cn("font-display font-semibold leading-[0.98] tracking-[-0.04em] text-fg [font-variation-settings:'wdth'_108,'opsz'_96]", titleSizes[size], className);

export const underlineClass = "relative isolate inline-block whitespace-nowrap after:absolute after:inset-x-[-3%] after:bottom-[0.02em] after:-z-10 after:h-[0.38em] after:-skew-x-[8deg] after:rounded after:bg-highlight after:content-['']";

// Smaller recurring pieces
export const bodyCopy = "text-[1.02rem] leading-[1.7] text-fg-muted";
export const stepBubble = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-edge bg-highlight font-display text-[1.05rem] font-extrabold text-highlight-fg shadow-sticker-sm [font-variation-settings:'wdth'_110]";
export const miniCard = "rounded-card border-2 border-edge bg-surface p-5 shadow-sticker-sm";
export const eyebrowBadge = "inline-flex items-center gap-2 rounded-full border-[1.5px] border-sun-500 bg-ink-950/50 px-4 py-[0.45rem] font-mono text-[0.7rem] uppercase tracking-[0.24em] text-sun-500 backdrop-blur-[10px]";
export const mediaFrame = "relative overflow-hidden rounded-sticker border-2 border-edge bg-ink-900 shadow-sticker [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_video]:h-full [&_video]:w-full [&_video]:object-cover";
// Form controls
export const field = "w-full rounded-xl border-2 border-edge bg-surface px-4 py-3 text-fg outline-none placeholder:text-fg/45 focus-visible:ring-4 focus-visible:ring-accent/40 disabled:opacity-60";
export const label = "block font-mono text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-fg/70";
