import { cn } from "./cn";

// Utility recipes for the members area, registration and admin roster. The
// roster is built imperatively (src/lib/registration/*.ts), so descendant
// variants ([&_input]:…) keep the class lists on the containers.

export const textButton = "cursor-pointer text-sm underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-teal-600 disabled:cursor-wait disabled:opacity-60";
export const memberStatus = "text-[0.95rem] leading-relaxed not-empty:mt-4";

const control = "[&_input]:min-w-0 [&_input]:w-full [&_input]:rounded-xl [&_input]:border-2 [&_input]:border-edge [&_input]:bg-surface [&_input]:px-4 [&_input]:py-[0.8rem] [&_input]:text-fg [&_input:focus-visible]:outline-3 [&_input:focus-visible]:outline-offset-3 [&_input:focus-visible]:outline-teal-600 [&_textarea]:min-w-0 [&_textarea]:w-full [&_textarea]:rounded-xl [&_textarea]:border-2 [&_textarea]:border-edge [&_textarea]:bg-surface [&_textarea]:p-[0.8rem] [&_textarea]:text-fg [&_select]:min-w-0 [&_select]:w-full [&_select]:rounded-xl [&_select]:border-2 [&_select]:border-edge [&_select]:bg-surface [&_select]:p-[0.8rem] [&_select]:text-fg";
export const memberForm = `grid gap-[0.85rem] [&_label]:font-[650] [&_button:disabled]:cursor-wait [&_button:disabled]:opacity-60 ${control}`;

// Roster
const phone = "max-[900px]:";
export const rosterToolbar = cn(memberForm, "mt-6 grid max-w-[760px] grid-cols-[minmax(0,1fr)_minmax(180px,260px)] items-end text-[0.85rem] max-[600px]:grid-cols-1 [&_label]:grid [&_label]:gap-[0.4rem] [&_input]:rounded-[0.4rem] [&_input]:border [&_input]:px-[0.8rem] [&_input]:py-[0.6rem] [&_select]:rounded-[0.4rem] [&_select]:border [&_select]:px-[0.8rem] [&_select]:py-[0.6rem]");
export const rosterColumns = `grid grid-cols-[minmax(180px,2fr)_0.35fr_minmax(110px,1.25fr)_0.8fr_0.8fr_0.9fr_1.1fr] items-center gap-[0.8rem] ${phone}grid-cols-3 ${phone}gap-x-[0.8rem] ${phone}gap-y-[0.65rem]`;
export const rosterHead = `${rosterColumns} mt-4 border-t-2 border-b border-edge px-[0.6rem] py-[0.7rem] font-mono text-[0.6rem] uppercase tracking-[0.06em] ${phone}hidden`;
export const duckiesRoster = `m-0 list-none p-0 ${phone}mt-4 ${phone}border-t-2 ${phone}border-edge`;
// "duckie-*" marker classes carry no styles; the Playwright suite uses them as hooks.
export const duckieRow = "duckie-row block border-b border-line p-0";
export const duckieProfile = "duckie-profile group";
export const duckieSummary = `duckie-summary ${rosterColumns} cursor-pointer list-none px-[0.6rem] py-3 hover:bg-highlight/16 group-open:bg-highlight/16 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-teal-600 [&::-webkit-details-marker]:hidden ${phone}px-[0.3rem] ${phone}py-[0.9rem]`;
export const duckieIdentity = `flex min-w-0 items-center gap-[0.6rem] ${phone}col-span-full`;
export const duckieIdentityRow = `${duckieIdentity} px-[0.6rem] py-3`;
export const duckieName = "duckie-name min-w-0 flex-1 font-display text-[1.05rem] font-[650] leading-[1.25] break-words";
// Flags a kid who is coming to the Cup; the brand yellow wants ink on top.
export const duckieFlag = "duckie-flag shrink-0 rounded-full border border-edge bg-sun-500 px-2 py-[0.15rem] font-mono text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-ink-950";
export const duckieAvatar = "h-9 w-9 shrink-0 rounded-full border border-edge object-cover";
export const duckieAvatarEmpty = `${duckieAvatar} grid place-items-center bg-sun-500 font-display text-[1.2rem] text-ink-950`;
export const duckieChevron = "text-[1.4rem] leading-none transition-transform group-open:rotate-90 motion-reduce:transition-none";
export const rosterCell = "min-w-0 text-[0.75rem] leading-[1.4] break-words";
export const rosterCellLabel = `sr-only ${phone}not-sr-only ${phone}mb-[0.2rem] ${phone}block ${phone}font-mono ${phone}text-[0.55rem] ${phone}uppercase ${phone}text-fg`;
export const rosterTone = { ok: "text-ok", pending: "text-caution", alert: "font-bold text-alert" } as const;
export const duckiePanel = `border-t border-dashed border-line bg-surface px-5 pt-4 pb-5 ${phone}px-3`;
export const duckieDetails = "min-w-0 basis-full";
export const duckieFacts = "my-4 grid grid-cols-3 gap-4 text-[0.85rem] max-[600px]:grid-cols-1 [&_dt]:font-mono [&_dt]:text-[0.65rem] [&_dt]:uppercase [&_dt]:tracking-[0.1em] [&_dd]:mt-[0.35rem] [&_dd]:leading-relaxed [&_dd]:break-words";
export const duckieActions = "duckie-actions flex flex-wrap gap-4";
export const duckieEdit = cn(memberForm, "mt-4 flex-[1_1_100%] grid-cols-[minmax(0,1fr)_auto_auto] items-center [&_label]:col-span-full");
export const duckieBox = cn(memberForm, "mt-4 rounded-xl border border-edge p-4");
export const duckieShare = cn(duckieBox, "[&_input]:text-[0.8rem]");
export const duckiePhotoForm = cn(memberForm, "mt-4 rounded-xl border border-dashed border-edge p-4 text-sm");
export const rosterAdd = "mt-5 [&>summary]:w-fit [&>summary]:cursor-pointer [&>summary]:rounded-[0.4rem] [&>summary]:border [&>summary]:border-edge [&>summary]:bg-sun-500 [&>summary]:px-[0.8rem] [&>summary]:py-2 [&>summary]:font-[650] [&>summary]:text-ink-950 [&>summary:focus-visible]:outline-3 [&>summary:focus-visible]:-outline-offset-3 [&>summary:focus-visible]:outline-teal-600 [&_form]:mt-3";
export const semesterControls = cn(memberForm, "flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.8rem] [&>label]:flex [&>label]:items-center [&>label]:gap-[0.7rem] [&_select]:w-auto [&_select]:max-w-full [&_select]:rounded-[0.4rem] [&_select]:border [&_select]:p-2 [&>p]:min-w-[220px] [&>p]:max-w-[360px] [&>p]:flex-1 [&>p]:leading-normal [&>details]:basis-full [&>details>summary]:m-0 [&>details>summary]:w-fit [&>details>summary]:cursor-pointer [&>details>summary]:underline [&>details>summary]:underline-offset-4 [&>details[open]>form]:mt-4 [&>details[open]>form]:max-w-[520px] max-[600px]:[&>label]:grid max-[600px]:[&>label]:w-full max-[600px]:[&_select]:w-full");
export const semesterForm = cn(memberForm, "[&_select]:w-full [&_select]:rounded-xl [&_select]:border-2 [&_select]:p-[0.8rem]");

// Registration sheet
export const registrationPage = "min-h-screen bg-canvas bg-[radial-gradient(ellipse_at_top_right,color-mix(in_oklab,var(--color-sun-500)_33%,transparent),transparent_45%)] font-sans text-fg antialiased";
export const registrationSheet = "mx-auto max-w-[850px] px-5 pt-12 pb-20";
export const registrationPanel = "mt-6 rounded-[1.25rem] border-2 border-edge bg-surface p-6 leading-[1.65] shadow-sticker-md max-[600px]:p-[1.1rem] [&>legend]:rounded-2xl [&>legend]:border [&>legend]:border-edge [&>legend]:bg-sun-500 [&>legend]:px-3 [&>legend]:py-[0.3rem] [&>legend]:font-mono [&>legend]:text-[0.8rem] [&>legend]:text-ink-950";
export const registrationGrid = "grid grid-cols-2 gap-4 max-[600px]:grid-cols-1";
export const registrationCheck = "flex items-start gap-[0.8rem] font-normal! [&>input]:mt-1! [&>input]:h-5! [&>input]:w-5! [&>input]:shrink-0 [&>input]:p-0! [&>input]:accent-teal-500";
export const guardianFields = cn(memberForm, "border-t border-dashed border-edge pt-4");
export const signaturePad = "aspect-[3/1] h-auto w-full max-w-[660px] touch-none rounded-xl border-2 border-dashed border-edge bg-white";
export const largeAvatar = "h-16 w-16 shrink-0 rounded-full border-2 border-edge object-cover";
