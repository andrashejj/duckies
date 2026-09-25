# Sunset Duckies — Claude notes

(Formerly "Duckies Surf Club", then "Sunset Surfers" — repo dir, package name, and `andrashejj/duckies` GitHub slug still use the old name.)

Landing site for a volunteer-run, member-funded surf club for kids in Tamarin, Mauritius. Astro + Tailwind v4 (via `@tailwindcss/vite`) + Motion.

## Routes
- `/` — home
- `/training-materials` — training library
- `/blog` — club logbook (posts live in `src/data/blog.ts`, e.g. `/blog/le-morne-reef-tour`)
- `/members/training` — club training: the roll call (organisers and selected coaches mark it, members see it) and the club points leaderboard; `/coach` and `/admin/training` redirect here

## Commands
- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm preview`

## Notes
- Shared copy and data lives in `src/data/site.ts`.
- Media lives in `public/media/`.

## Styling
- Tailwind utilities only: no component stylesheets, no inline `style` colours. `src/styles/global.css` holds the design tokens (palette, semantic colours, fonts, shadows, keyframes) and nothing else. It is the only place a colour value is written.
- Colours in markup are semantic tokens (`bg-canvas`, `bg-surface`, `text-fg`, `text-fg-muted`, `border-line`, `border-edge`, `bg-accent`, `bg-highlight`, `bg-sticker-*`, `bg-board`, `text-signal` …). They follow `<html data-theme>`, which `ThemeScript` sets before paint from the stored choice (`localStorage.theme`) or else the system preference, and `ThemeToggle` in the header flips; the Tailwind `dark:` variant keys off the same attribute. Brand colours (`coral-500`, `sun-500`, `teal-500` …) are constant in both modes and want `text-ink-950` on top.
- Themed scopes re-point the tokens: `theme-performance` (branding workspace, set on `<html>` by `BaseLayout variant="performance"`) and `theme-studio` (granola kitchen root).
- Inside an arbitrary value use the raw variable, e.g. `shadow-[7px_7px_0_0_var(--edge)]`, never `var(--color-edge)` — the `--color-*` alias is also emitted on `:root` and would ignore the scope.
- The granola pouch artwork (`src/lib/granola-pouch.ts`, inline SVG shared by the shop and the branding simulator) reads the plain `--pouch-*` variables on `:root`; they are printed colours, the same in both modes. Tailwind v4 only emits `@theme` variables a utility uses, so artwork variables live outside `@theme`.
- Reusable pieces are components or recipe strings, never CSS classes: `src/components/ui/*` (Cta, Kicker, Chip, StickerCard, SectionTitle, Underline) with React twins in `src/components/react/ui.tsx`, plus `src/lib/ui.ts`, `members-ui.ts`, `plan-ui.ts`, `studio-ui.ts`. `cn()` (`src/lib/cn.ts`, tailwind-merge) lets a `class` prop override a recipe.
- `g-*`, `duckie-*` and `b-badge` class names carry no styles; the Playwright suite uses them as hooks.
- `src/private/branding/*.html` are standalone printable templates with their own inline CSS and are outside the Tailwind pipeline.

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:

Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.

Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.

Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.

Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
</frontend_aesthetics>
