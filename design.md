# Design — Sunset Duckies

Design language and decisions for the site. The goal is to keep new work feeling like the rest of the site without re-deriving it from the CSS every time. If you're adding a section, page, or component, read this first.

Source of truth for tokens: [src/styles/global.css](src/styles/global.css). Source of truth for copy: [src/data/site.ts](src/data/site.ts). This document explains the *why* behind both.

---

## North star

A kids' surf club in Tamarin Bay run by volunteers and funded by member dues. The site has to feel:

- **Kid-energy, not corporate.** Parents are the readers, but children are the subject. Anything that smells like a SaaS landing page is wrong.
- **Hand-made, not templated.** Brutalist stickers, taped-down photos, wonky italics. The site should look like a zine someone printed at the beach club, not a Figma starter.
- **Confident, not cute.** Warm and playful, but the kids in the photos are genuinely getting good at surfing. Don't infantilise — no baby-talk, no kiddie-ride imagery.
- **Sunset-coded.** The name is the brief. Cream, coral, sun-yellow, deep ink. Every session ends at sunset.

If a design choice doesn't reinforce one of those, cut it.

---

## Type

Four families, each with a defined job. Don't introduce a fifth.

| Role     | Family                | When to use                                                                 |
| -------- | --------------------- | --------------------------------------------------------------------------- |
| Display  | **Bricolage Grotesque** (variable) | Headlines, section titles, CTAs, nav. Lean on the width axis (`wdth` 105–110). |
| Accent   | **Fraunces** (with `SOFT` + `WONK` on) | Italic flourishes inside display copy ("*kids only*", marquee `<em>`). Use sparingly — it's seasoning. |
| Body     | **Outfit**            | All prose, captions, footer text. `ss01` + `cv11` features are on globally. |
| Mono     | **JetBrains Mono**    | Kickers, tag pills, chip labels, footer microtext. Always uppercase, wide tracking (`0.22–0.28em`). |

Rules:

- Display copy should run *wide* — `font-variation-settings: "wdth" 106–110`. The default 100 width reads timid in this layout.
- Tight negative tracking on display (`-0.03em` to `-0.04em`). Loose, wide tracking on mono labels.
- Fraunces italic is the only italic on the site. If you find yourself italicising in Outfit, you want emphasis — bold it instead, or wrap it in `.ink-underline` / `.ink-highlight`.
- Don't reach for new font families. The four above carry every register we need.

---

## Color

Defined as Tailwind v4 `@theme` tokens in [global.css](src/styles/global.css#L3). Use the CSS variables (`var(--color-coral-500)`), not raw hex.

**Foundation** (always present)

- `--color-cream` (`#fff5de`) — page base
- `--color-cream-soft` (`#fffaec`) — cards, headers
- `--color-ink-950` (`#0b1620`) — text, borders, shadows

**Hot accents** (use one or two per section, not all five)

- `--color-coral-500` `#ff4e2b` — primary CTA, energy
- `--color-sun-500` `#ffd23f` — highlight, step bubbles, kicker bg
- `--color-teal-500` `#07c9b6` — ocean/water moments, secondary hover
- `--color-pink-400` `#ff72a6` — playful tags, hero glow
- `--color-lilac-400` `#b49cff` — cool counterweight; use last

Rules:

- Hard ink borders on everything (`2px solid var(--color-ink-950)`). Never use a thin grey border — it kills the brutalist read.
- Shadows are always solid ink, never blurred (`box-shadow: 6px 6px 0 0 var(--color-ink-950)`). No `rgba` drop-shadows.
- Cards default to `--color-cream-soft`. To tint, use `.sticker-coral` / `.sticker-teal` / `.sticker-sun` / `.sticker-pink` / `.sticker-lilac` rather than reinventing pastel backgrounds.
- The legacy `ocean-*`, `sand-*`, `seafoam-*`, `sun-300` aliases in `:root` are scaffolding for old utilities — don't introduce *new* usages, prefer the canonical token.

---

## Surfaces

Everything sits on the same brutalist sticker chassis.

- **`.surface-card`** — the base card. Cream-soft fill, 2px ink border, 6px offset ink shadow, ~28px radius. On hover, lifts (`translate(-2px, -2px)`) and the shadow extends.
- **`.surface-card.dashed`** — adds the inner dashed cutout for that zine feel. Use on hero/feature cards, not on every tile (it becomes noise).
- **`.glass-panel`** — dark ink variant with blur. Use when the card sits *over* a photo or video.
- **`.media-frame`** — for any `<img>` or `<video>`. Same border + shadow. Photos that aren't in a media-frame look like they're floating in space.

Tilt utilities (`.tilt-left`, `.tilt-right`) give that taped-on-the-fridge feel. Apply at rest, snap back to `0deg` on hover. **Don't tilt more than ~2 deg**, and never tilt a card the user has to read carefully (forms, dense copy).

---

## CTAs & buttons

Three button shapes; don't invent a fourth.

- **`.cta-primary`** — coral fill, ink border, ink shadow, uppercase display type. Has a `→` that slides right on hover. The "do the thing" button. One per viewport ideally.
- **`.cta-secondary`** — cream-soft fill, hovers to teal. Pair with primary; never use two primaries side-by-side.
- **`.chip`** — small mono pill with a `✦` glyph. For inline facts ("Wednesday + Friday", "Rs 5,000 / year"). Not clickable-looking — use only for facts, not actions.

The `.section-kicker` is the small uppercase tag that introduces a section (with the leading `★`). Every section should have one — they're the rhythmic spine of the page.

---

## Motion

Tasteful, not twitchy. The aesthetic does the heavy lifting; motion is seasoning.

- **Entrance reveals**: scroll-in via Motion's `inView` — opacity 0→1, y 28→0, blur 10→0, 0.7s, custom ease `[0.22, 1, 0.36, 1]`. Mark targets with `data-reveal`. See [BaseLayout.astro:220-228](src/layouts/BaseLayout.astro#L220-L228).
- **Hero staggered float**: elements marked `data-float` enter with a 0.1s stagger.
- **Ambient loops**: `.floating`, `.spin-slow`, `.wobble` for decorative shapes (sunburst, blobs, badges). Never apply to readable content.
- **Marquee**: ink-on-cream ticker at the bottom of every page. 38s loop, paused under `prefers-reduced-motion`.
- **Hero video**: played at `0.72×` rate for dreamier feel (`[data-hero-video]`).

Rules:

- Always respect `prefers-reduced-motion` — animations are removed and reveals are forced visible. Don't add a new animation without an opt-out.
- Hover transforms use `translate(-2px, -2px)` paired with a larger shadow. Active state inverts to `translate(2px, 2px)` with a smaller shadow. That "press" is the site's signature interaction — keep it consistent.
- No parallax, no scroll-jacking, no big GSAP scenes. The brutalist style wants stillness punctuated by small moves.

---

## Atmosphere

The page background is doing real work — don't paint over it.

- Fixed three-blob radial gradient (pink top-left, sun top-right, teal bottom) on `:root`. `background-attachment: fixed` so it stays put as you scroll.
- SVG paper grain via `body::before`, `mix-blend-mode: multiply`, opacity 0.3. This is what makes flat color feel printed instead of digital.
- Decorative shapes (`.sunburst`, `.blob-coral`, `.blob-teal`) are placed *inside* sections to add local depth. Always `pointer-events: none` and `position: absolute` inside a `relative` parent.
- `.wave-divider` (repeating SVG squiggle) separates sections when a hard line would feel too corporate.

If a section feels flat, the answer is usually a blob behind the card — not a new gradient on the card itself.

---

## Voice

Copy lives in [src/data/site.ts](src/data/site.ts). Read it before writing new lines so the register matches.

- Short, declarative sentences. Surf-club casual, not marketing-speak.
- "Kids", "duckies", "the lineup", "paddle out", "the bay" — use the vocabulary the club actually uses.
- Numbers are concrete: "2x sessions/week", "4 comps a year", "Rs 5,000". Avoid "many", "lots", "various".
- Decorative punctuation (`★`, `✦`, `✿`, `→`, `·`) is part of the voice. Use it in chips, kickers, marquee — not in body prose.
- Don't write headlines that could appear on any surf school. "Surf the Bay · Tamarin" works because it names the place. "Catch the wave with us!" doesn't.

---

## Don't

- Don't add a new font, color, button shape, or card style without first checking whether an existing token does the job.
- Don't use grey. The site has cream, ink, and tinted accents — grey reads as "default browser" and breaks the spell.
- Don't soften the shadows. Blurred shadows on a brutalist card look like a bug.
- Don't centre-align long copy. Display headlines can centre; paragraphs should left-align in a constrained measure.
- Don't tilt forms, dense lists, or anything the user has to scan. Tilt is for vibe, not function.
- Don't introduce purple gradients on white. That's the AI-slop aesthetic this site exists to avoid (see the `<frontend_aesthetics>` brief in [CLAUDE.md](CLAUDE.md)).
