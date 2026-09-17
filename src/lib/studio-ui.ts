import { cn } from "./cn";

// Recipes for the granola kitchen (.theme-studio scope): paper, moss ink and
// the pine results board. "g-*" marker classes carry no styles; the Playwright
// suite uses them as hooks.

export const eyebrow = "font-mono text-[0.65rem] tracking-[0.13em]";
export const explain = "my-[1.1rem] text-[0.73rem] leading-[1.65] text-fg-muted";
export const sectionTitle = "mb-6 flex flex-col gap-2 [&>span]:font-mono [&>span]:text-[0.6rem] [&>span]:tracking-[0.12em] [&>span]:text-fg-muted [&>b]:font-display [&>b]:text-[1.8rem] [&>b]:font-medium [&>b]:leading-[1.15] [&>b]:tracking-[-0.025em]";
export const editorSection = "border-b border-line p-8 max-[1050px]:p-6 max-[520px]:p-5";

// Form controls
export const field = "flex min-w-0 flex-col gap-2 [&>span:first-child]:text-[0.68rem] [&>span:first-child]:leading-[1.4] [&>span:first-child]:text-fg-muted";
export const control = "w-full min-w-0 rounded-[3px] border border-edge bg-surface px-[0.65rem] py-[0.6rem] text-[0.86rem] leading-[1.3] text-fg invalid:border-loss max-[520px]:px-[0.4rem] max-[520px]:text-[16px]";
export const unit = "relative flex items-center";
export const unitInput = cn(control, "pr-8 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none max-[520px]:pr-[1.4rem]");
export const unitSuffix = "pointer-events-none absolute right-[0.6rem] text-[0.66rem] text-fg-muted max-[520px]:right-[0.35rem] max-[520px]:text-[0.56rem]";
export const textarea = cn(control, "min-h-[60px] resize-y");
export const addButton = "mt-4 block w-full rounded-[3px] border border-dashed border-line bg-transparent p-[0.8rem] text-[0.8rem] text-accent-text hover:bg-highlight";
export const removeButton = "h-8 w-8 shrink-0 rounded-[3px] border border-transparent bg-transparent p-0 text-[1.4rem] leading-none text-fg-muted hover:border-loss hover:text-danger-fg";
export const slider = "flex flex-col gap-[0.8rem] [&>span]:flex [&>span]:justify-between [&>span]:text-[0.8rem] [&_strong]:font-mono [&_strong]:font-medium [&>input]:w-full [&>input]:cursor-pointer [&>input]:accent-accent-text [&>small]:text-[0.72rem] [&>small]:text-fg-muted";
export const message = "m-0 bg-tint px-6 py-4 text-[0.85rem]";
export const errorMessage = cn(message, "bg-danger text-danger-fg");
export const textButton = "border-0 bg-transparent text-[0.72rem] text-fg underline underline-offset-[3px]";

// Ingredient dots and cost bars share one categorical palette
export const swatches = ["bg-sage", "bg-apricot", "bg-mauve", "bg-honey", "bg-mint", "bg-stone"];

// Results board
export const board = "g-results sticky top-[min(110px,calc(100dvh-var(--g-panel-height,1100px)-16px))] my-6 mr-6 scroll-mt-[125px] rounded-[3px] bg-board p-7 text-board-fg max-[1050px]:mr-4 max-[1050px]:p-5 max-[800px]:static max-[800px]:m-5 max-[800px]:p-7 max-[520px]:p-[1.4rem]";
export const boardLabel = "font-mono text-[0.58rem] tracking-[0.11em] text-board-muted";
export const boardList = "[&>div]:flex [&>div]:justify-between [&>div]:gap-4 [&>div]:py-[0.45rem] [&_dd]:m-0 [&_dd]:text-right [&_dd]:tabular-nums [&_dt]:text-board-muted";
export const boardNote = "text-[0.6rem] leading-[1.6] text-board-muted";
export const chart = "mt-6 border-t border-board-line pt-4 [&_svg]:mt-[0.7rem] [&_svg]:block [&_svg]:w-full [&_svg]:overflow-visible [&_text]:font-mono [&_text]:text-[8px] [&_text]:fill-board-muted";

// Business case sheet
export const sheetRow = "grid grid-cols-[minmax(0,1fr)_minmax(170px,230px)] items-start gap-x-7 gap-y-4 @max-[600px]:grid-cols-1 @max-[600px]:gap-3";
export const sheetInputs = "grid grid-cols-[repeat(auto-fit,minmax(min(100%,120px),1fr))] items-end gap-[0.85rem] min-w-0 [&_.g-field>span:first-child]:text-[0.62rem]";
export const sheetAmount = "flex min-h-full flex-col gap-[0.3rem] border-l border-dashed border-edge pl-6 text-right @max-[600px]:flex-row @max-[600px]:flex-wrap @max-[600px]:items-baseline @max-[600px]:justify-between @max-[600px]:border-l-0 @max-[600px]:border-t @max-[600px]:border-dotted @max-[600px]:pt-[0.6rem] @max-[600px]:pl-0 @max-[600px]:text-left [&>span]:text-[0.68rem] [&>span]:leading-[1.4] [&>span]:text-fg-muted [&>span]:break-words [&>strong]:font-mono [&>strong]:text-[1.05rem] [&>strong]:font-medium [&>strong]:tabular-nums @max-[600px]:[&>strong]:text-right [&>small]:text-[0.6rem] [&>small]:leading-[1.5] [&>small]:text-fg-muted [&>small]:break-words @max-[600px]:[&>small]:w-full";
export const costLine = "before:text-fg-muted before:content-['−\\00a0']";
export const sheetNote = "mt-[0.9rem] max-w-[70ch] text-[0.7rem] leading-[1.65] text-fg-muted";
