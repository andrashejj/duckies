# Sunset Duckies

Guidance for coding agents (Claude Code, Codex, etc.). `AGENTS.md` is a symlink to this file.

(Formerly "Duckies Surf Club", then "Sunset Surfers" — repo dir, package name, and `andrashejj/duckies` GitHub slug still use the old name.)

Site and member app for a volunteer-run, member-funded surf club for kids in Tamarin, Mauritius: public pages, a members area (families, photos, social feed, club points), registration with signed waivers, Cup day judging, a reservation shop, and a private branding workspace. One Astro app on Vercel.

`README.md` is the detailed feature and setup reference; `DEPLOYMENT.md` covers production, migrations and per-feature rollout notes; `design.md` is the design language. Read the relevant section before changing a feature.

## Stack
- Astro 6 with `@astrojs/vercel` (Node functions in `fra1`, see `vercel.json`) and `@astrojs/react` for interactive islands (`src/components/react/*.tsx`)
- Tailwind v4 via `@tailwindcss/vite`; Motion for entrance/scroll effects
- Better Auth (email-code sign-in, emails via Resend) + PostgreSQL. Better Auth uses the `pg` pool in `src/lib/server/db.ts`; app queries use Prisma 7 (`@prisma/adapter-pg`, client generated to the gitignored `src/generated/prisma/`)
- `pdf-lib` for signed waiver PDFs; `sharp` for photo processing (photos are stored in Postgres); optional OpenAI granola adviser
- pnpm (version pinned in `package.json`), Node from `.nvmrc`. Ignore the stale `package-lock.json`.

## Routes
Public pages are prerendered; anything needing a session sets `export const prerender = false`. `src/middleware.ts` does session, membership, admin and branding-access checks and `no-store` headers for private paths — check it when adding a private route.
- Public: `/`, `/blog` (club logbook, posts in `src/data/blog.ts`), `/training-materials`, `/register`, `/sunset-duckies-cup`, `/sunset-duckies-cup-vol-2` (+ `/live` leaderboard), `/s/[token]` (public share links), `/login`
- Members: `/members` (+ `lineup`, `me`, `profile` = My family, `people/[id]`, `posts/[id]`), `/gallery/*`, `/shop`, `/account/*`, `/orders/[id]`
- Organisers: `/admin/*` (kids, parents, training, cup, gallery, drops, products, orders, customers); judges: `/cup/judge`
- Branding workspace (approval-gated): `/branding-plan/*`, `/product-ideas`, `/templates/[name].html` (serves `src/private/branding/*.html`)
- API: `src/pages/api/**` (`auth/[...all]` is Better Auth)

## Code map
- `src/data/` — static copy and content: `site.ts` (shared copy), `blog.ts`, `gallery.ts`, `shop.ts`, `plan-tasks.ts`, `molt.ts`
- `src/lib/server/` — server-only DB, auth and feature logic; `src/lib/registration/` — registration, waivers, semesters, family; `src/lib/email/` — email sending
- `src/lib/session.ts` — `getSession`/`isAdmin` used by middleware
- `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`
- `scripts/` — `member.ts`, `db-guard.ts`, `db-target.ts`, one-off admin tools (`import-kid.ts`, `correct-birth-date.ts`, `verify-waiver.ts`) and Nextcloud share listers (`list-*.sh`)
- Media: `public/media/`; members-only gallery files in `src/assets/gallery/` (bundled into the function by `astro.config.mjs`)

## Commands
- `docker compose up -d` — local Postgres on `localhost:54329` (see `.env.example`)
- `pnpm install` (postinstall runs `prisma generate`)
- `pnpm dev` — dev server on 4321 (`--host`)
- `pnpm build` — `prisma generate && astro build`
- `pnpm check` — `astro check && tsc --noEmit`
- `pnpm test` — Playwright against a real dev server on 4329; requires `TEST_DATABASE_URL` pointing at a database named `duckies_test` or `duckies_test_<suffix>` (it gets reset). Emails and AI calls are intercepted.
- `pnpm member add <email> [member|organiser]` / `pnpm member remove <email>`
- `pnpm db:seed` — draft granola drop

## Database
- Env: `DUCKIES_DATABASE_URL` (never `DATABASE_URL`), `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `WAIVER_SIGNING_PRIVATE_KEY`; optional `EMAIL_ADMIN_NOTIFY`, `OPENAI_API_KEY`, `GRANOLA_AI_MODEL`. See `.env.example`.
- Schema changes: edit `prisma/schema.prisma` → `pnpm db:migration <name>` (create-only) → review/extend the SQL → `pnpm db:migrate` locally → commit. Never `prisma db push`.
- Apply to remote DBs *before* pushing code that needs the migration: `pnpm db:migrate:staging` / `pnpm db:migrate:production` (direct URLs from `STAGING_DATABASE_URL` / `PRODUCTION_DATABASE_URL` in local `.env`); `pnpm db:status:*` is read-only.

## Git & deploy
- Feature branches → PR into `staging` (staging preview); `staging` → `main` release PR (production, www.sunsetduckies.com). Vercel builds from Git.
- `.local-data/` holds private operator config, keys and import files. It is gitignored; never commit, deploy or read it into public output.

## Styling
- Tailwind utilities only: no new component stylesheets, no inline `style` colours. `src/styles/global.css` holds the design tokens (palette, semantic colours, fonts, shadows, keyframes) and is the only place a colour value is written. The one exception is `src/styles/photo-journal.css`, the layout for the member-area "journal" shell (`theme-journal`); it reads the same tokens.
- Colours in markup are semantic tokens (`bg-canvas`, `bg-surface`, `text-fg`, `text-fg-muted`, `border-line`, `border-edge`, `bg-accent`, `bg-highlight`, `bg-sticker-*`, `bg-board`, `text-signal` …). They follow `<html data-theme>`, which `ThemeScript` sets before paint from the stored choice (`localStorage.theme`) or else the system preference, and `ThemeToggle` in the header flips; the Tailwind `dark:` variant keys off the same attribute. Brand colours (`coral-500`, `sun-500`, `teal-500` …) are constant in both modes and want `text-ink-950` on top.
- `BaseLayout` takes `variant` (`default` | `performance` | `journal`) and `workspace` (`member` | `admin`; `member` implies the journal shell). Themed scopes re-point the tokens: `theme-performance` (branding workspace, set on `<html>` by `variant="performance"`), `theme-journal` (member area) and `theme-studio` (granola kitchen root).
- Inside an arbitrary value use the raw variable, e.g. `shadow-[7px_7px_0_0_var(--edge)]`, never `var(--color-edge)` — the `--color-*` alias is also emitted on `:root` and would ignore the scope.
- The granola pouch artwork (`src/lib/granola-pouch.ts`, inline SVG shared by the shop and the branding simulator) reads the plain `--pouch-*` variables on `:root`; they are printed colours, the same in both modes. Tailwind v4 only emits `@theme` variables a utility uses, so artwork variables live outside `@theme`.
- Reusable pieces are components or recipe strings, never CSS classes: `src/components/ui/*` (Cta, Kicker, Chip, StickerCard, SectionTitle, Underline) with React twins in `src/components/react/ui.tsx`, plus recipe modules `src/lib/*-ui.ts` (`ui`, `members-ui`, `profile-ui`, `plan-ui`, `studio-ui`, `comp-ui`, `cup-ui`). `cn()` (`src/lib/cn.ts`, tailwind-merge) lets a `class` prop override a recipe.
- `g-*`, `duckie-*` and `b-badge` class names carry no styles; the Playwright suite uses them as hooks.
- `src/private/branding/*.html` are standalone printable templates with their own inline CSS and are outside the Tailwind pipeline.

<frontend_aesthetics>
The site has an established look, documented in `design.md`: a hand-made, sunset-coded zine (cream, coral, sun-yellow, deep ink; brutalist sticker cards with hard shadows). Extend that system rather than inventing a new one, and check existing tokens and components before adding fonts, colours, buttons or card styles.

Avoid the generic "AI slop" aesthetic: no Inter/Roboto/system-font defaults, no purple gradients on white, no grey, no blurred soft-shadow card grids, no cookie-cutter SaaS layouts. Prefer one well-orchestrated staggered reveal (Motion or CSS) over scattered micro-interactions, and layer gradients/texture rather than flat backgrounds.
</frontend_aesthetics>
