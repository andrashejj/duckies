import { cn } from "./cn";

// Recipes for the Project Molt branding workspace (.theme-performance scope):
// mono caps, 1px hairlines and the acid signal colour, in light or dark.
// Colours are semantic tokens only — accent is acid on the workspace, and
// accent-text is the readable version of it on the light canvas.

export const overline = "m-0 mb-6 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-accent-text";
export const monoMeta = "flex justify-between gap-4 font-mono text-[0.66rem] font-semibold uppercase tracking-[0.11em] text-fg-muted";
export const monoTag = "font-mono text-[0.66rem] font-semibold uppercase tracking-[0.11em]";
export const muted = "m-0 text-base leading-[1.75] text-fg-muted";

export const section = "mx-auto max-w-[1400px] scroll-mt-24 px-[clamp(1.5rem,5vw,5rem)] py-[clamp(5rem,9vw,9rem)]";
export const briefSection = cn(section, "py-[clamp(4rem,7vw,7rem)]");
export const divider = "mx-auto h-px max-w-[1400px] bg-line";

export const heading = "m-0 font-display text-[clamp(3rem,5.8vw,6rem)] font-[650] leading-[0.92] tracking-[-0.055em] text-fg max-[680px]:text-[clamp(2.8rem,14vw,4rem)]";
export const subheading = "m-0 font-display text-[clamp(1.4rem,2.2vw,1.9rem)] font-[650] leading-[1.1] tracking-[-0.03em] text-fg";
// Section heading inside a workspace page, sized to sit under the page title.
export const sectionHeading = "m-0 font-display text-[clamp(1.9rem,3.4vw,3rem)] font-[650] leading-[1] tracking-[-0.04em] text-fg";
export const cardTitle = "font-display font-[650] leading-[1.05] tracking-[-0.035em] text-fg";

// Panels
export const panel = "bg-linear-145 from-surface-2/92 to-canvas/90";
export const hairline = "border border-line";
export const signalEdge = "border border-line border-l-[3px] border-l-accent";
export const tintBg = "bg-accent/5";

// Grids that use 1px gaps on a line-coloured background to draw hairlines
export const cellGrid = "grid gap-px border border-line bg-line";
export const cell = "bg-canvas";

// Buttons / links
export const outlineButton = "px-[0.85rem] py-[0.7rem] border border-accent/45 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-accent-text transition-[background-color,color] duration-200 hover:bg-accent hover:text-accent-fg";
export const inlineLink = "border-b border-accent text-fg";

// Tables
export const tableWrap = "mt-10 overflow-x-auto border border-line";
export const table = "w-full border-collapse text-left";
export const th = "border-b border-line bg-fg/4 px-5 py-4 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-fg-muted";
export const td = "border-b border-line px-5 py-4 text-[0.9rem] leading-[1.5] text-fg-muted [tr:last-child_&]:border-b-0";
export const tdFirst = "w-[180px] font-mono text-[0.7rem] text-fg";

// Access / teaser (branding-access)
export const bKicker = "m-0 mb-7 font-mono text-[11px] uppercase tracking-[0.08em] text-accent-text";
export const bMono = "font-mono text-[11px] uppercase tracking-[0.08em]";
export const bTitle = "m-0 mb-7 font-brand text-[clamp(56px,7vw,100px)] leading-[1.02] font-normal uppercase text-fg";
export const bLead = "max-w-[620px] text-[19px] leading-[1.65] text-fg-muted";
export const bButton = "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-none border border-accent bg-accent px-[18px] py-3 text-[14px] font-[650] text-accent-fg no-underline hover:bg-accent/80 disabled:cursor-wait disabled:opacity-50";
export const bSecondary = cn(bButton, "border-line bg-transparent text-fg hover:bg-surface-2");
export const bLink = "min-h-11 cursor-pointer border-0 bg-transparent p-0 text-accent-text underline underline-offset-4 disabled:cursor-wait disabled:opacity-50";
export const bField = "w-full rounded-none border border-line bg-canvas p-3 text-fg focus:outline-2 focus:outline-offset-2 focus:outline-accent";
export const bPanel = "border border-line border-t-[5px] border-t-accent bg-surface p-8 max-[760px]:mt-0 max-[760px]:p-6";
export const bPanelTitle = "m-0 mb-3 font-brand text-[32px] font-normal leading-[1.1] uppercase text-fg";
export const bBadge = "b-badge border border-line px-[10px] py-[7px] font-mono text-[11px] uppercase tracking-[0.08em]";

// Workspace pages (BrandingLayout): a kicker, a brand-face title and a lead.
export const pageTitle = "m-0 max-w-[14ch] font-brand text-[clamp(2.9rem,7vw,5.6rem)] font-normal uppercase leading-[0.92] tracking-[0.005em] text-fg";
export const pageLead = "m-0 max-w-[680px] text-[clamp(1.05rem,1.6vw,1.25rem)] leading-[1.6] text-fg-muted [&_a]:border-b [&_a]:border-accent [&_a]:text-fg";
