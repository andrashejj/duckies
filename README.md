# Sunset Duckies

Landing site for a volunteer-run, member-funded surf club for kids in Tamarin, Mauritius. (Previously "Duckies Surf Club", then "Sunset Surfers".)

## Stack

- Astro
- Tailwind CSS via `@tailwindcss/vite`
- Motion for entrance and scroll effects
- Build-time QR code generation with `qrcode`
- Better Auth email-code sign-in, PostgreSQL, and Astro API routes on Vercel

## Routes

- `/`
- `/training-materials`
- `/login` — shared email-code sign-in for members and customers
- `/members` — member-only club lineup
- `/members/profile` — your family, registrations and fees
- `/account/profile` — edit your own name, phone and photo
- `/admin/kids`, `/admin/parents` — organiser tables, with shared top navigation
- `/api/auth/*` — Better Auth endpoints (server-rendered)
- `/api/kids` — authenticated roster; organisers can add kids
- `/api/kids/:id` — organisers can rename or remove kids
- `/admin/cup`, `/cup/judge`, `/sunset-duckies-cup-vol-2/live` — Cup day board, judge sheet and public leaderboard (see below)

## Commands

- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm preview`
- `pnpm check`
- `pnpm db:migrate`
- `pnpm member add <email> [member|organiser]`
- `pnpm member remove <email>`

## Members area setup

The landing page stays static. Its header checks `/api/session` for navigation state and shows signed-in users a **My club** menu. The roster lives on `/members` for members and `/admin/kids` for organisers; old `/#our-duckies` bookmarks redirect there. Private pages have top navigation with direct links to **My profile** and **My family**. Kids’ names are never embedded in public HTML or JavaScript bundles. The roster API validates the session and current membership on every request, sets `no-store` headers for browsers and CDNs, and permits only organisers to change the roster. The roster starts empty; no competition entries are imported automatically.

1. Run `docker compose up -d` for a dedicated local PostgreSQL database on port 54329, or provision a dedicated PostgreSQL database yourself.
2. Add the variables from `.env.example` to your local `.env`, preserving any existing configuration. `DUCKIES_DATABASE_URL` is deliberately separate from legacy `DATABASE_URL`. Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. Set `BETTER_AUTH_URL` to the exact site origin (`http://localhost:4321` locally).
3. Configure `RESEND_API_KEY` and `EMAIL_FROM` with a verified Resend sender. Sign-in uses six-digit codes valid for ten minutes. Codes are hashed in the database, have three attempts, and requests are rate limited using shared database storage.
4. Run `pnpm db:migrate` (`prisma migrate deploy`, after a check that refuses a legacy Auth.js database). It applies the checked-in migrations in `prisma/migrations`, which create the Better Auth tables and every club, shop and branding table. Do not run against a shared application database or a PostgreSQL template database.
5. Approve the first organiser with `pnpm member add you@example.com organiser`, then add parents with `pnpm member add parent@example.com`. These commands manage access without sending email. Removing a member also revokes their existing sessions.
6. Run `pnpm dev`, open `/login`, and request a code. Once signed in, organisers can add, edit, and remove names directly on the landing page. Store only the name used at the club; first name plus surname initial is usually enough.

Club-approved email addresses and customers with an existing reservation can request sign-in codes. Unknown email addresses receive the same acknowledgement but no email. Shop customers can view their own reservations; they cannot access the roster or administration. Approval is required independently of authentication, so a removed member cannot use a still-valid session to read it.

## Shop and shared backend

The reservation shop from `claude/webshop-admin-panel` is integrated into the same Astro application. `/shop`, `/shop/:slug`, `/orders/:id`, `/account`, and `/admin` render on the server. The landing page and existing public content remain static.

Better Auth reads and writes the `user`, `session`, `account`, `verification` and `rateLimit` tables at runtime through the **same** PostgreSQL connection pool from `src/lib/server/db.ts`; Prisma runs the shop queries against the same `user` IDs. There is no separate Auth.js/Google login, admin user table, database URL, or backend deployment. `prisma/schema.prisma` describes every table, and `prisma/migrations` is the only way the database changes: `pnpm db:migrate` (`prisma migrate deploy`) applies them, `pnpm db:generate` rebuilds the client after editing the schema. Do **not** use `prisma db push`: it has no history and cannot carry the `CHECK` constraints, triggers and seed rows the migrations contain. The generated client is ignored and rebuilt by `pnpm install`, rather than checked in.

- Guests can reserve available products and receive a private receipt link. Customers can sign in with their reservation email to see their own history at `/account/orders`.
- Club members can use their existing sign-in for shop accounts and the kids list. Only the `organiser` role in `club_member` grants `/admin` access.
- Organisers manage drops, products, reservations, cash collection, and internal notes. Internal notes are never included in customer emails.
- Draft, closed, future, and expired drops are excluded from both catalogue queries and reservations. Closing a drop preserves its product associations.
- Inventory is reserved within a transaction; repeated request IDs return the same order. Cancellation restores deducted stock once. Prices and valid sizes come from the database.
- Reservations are not online payments. Customer confirmation and status emails use the same sender as login codes. Set `EMAIL_ADMIN_NOTIFY` for organiser alerts. If email delivery fails, the receipt accurately says that the reservation was saved but the email was not sent.

The shop sells the club's granola: three flavours — **The OG**, **Dawn Patrol**, **Power Up** — in 300 g pouches. `src/data/shop.ts` derives each product's name, weight and price from the matching starter recipe in `src/lib/granola.ts`, so the shelf and the recipe sheet never disagree, and the artwork is the drawn pouch in `src/lib/granola-pouch.ts` (`ProductVisual` renders it inline for a product whose slug is a flavour; `imageUrl` stays empty). Run `pnpm db:seed` to add the three flavours to a **draft** `granola-001` drop. Re-running it preserves edits and other products and never publishes or resets prices; the one thing it does change is to take the founding-kit apparel concepts an older seed left behind off the rack (`active=false`, their `drop-001` closed), keeping the rows. Sign in as an organiser, review prices and stock at `/admin`, then mark the drop live when it is ready. Current pickup copy uses Monday/Friday sessions.

To change the database, edit `prisma/schema.prisma`, then run `pnpm db:migration <name>` (`prisma migrate dev --create-only`) against your local database to generate `prisma/migrations/<timestamp>_<name>/migration.sql` from the diff. Open that file before applying it: add anything the schema cannot express (a `CHECK` constraint, a trigger, seed rows, a data fix) as plain SQL, and keep statements self-contained because Prisma runs each one in its own implicit transaction (no `ON COMMIT DROP` temp tables). Then `pnpm db:migrate` locally, commit the folder, and run `pnpm db:migrate:staging` and `pnpm db:migrate:production` (direct URLs in your local `.env` as `STAGING_DATABASE_URL` / `PRODUCTION_DATABASE_URL`) before pushing the code that needs it; `pnpm db:status:production` shows whether anything is pending. Running `pnpm db:migration` with no schema change creates an empty migration: delete the folder rather than committing it. Better Auth upgrades that add columns go through the same path: generate the SQL with `pnpm exec @better-auth/cli generate` and paste it into a migration.

`20260917000000_baseline` is the schema as it stood when Prisma Migrate took over from the old `db/*.sql` runner; databases that predate it were marked as having applied it with `pnpm exec prisma migrate resolve --applied 20260917000000_baseline`. Legacy shop data from the old Auth.js deployment is not imported automatically; it needs a reviewed export/import, including mapping old user IDs to Better Auth users. Production uses a dedicated database provisioned for the shared backend.

## Deployment

The Vercel adapter preserves static public pages and deploys the API as Node functions. Set `DUCKIES_DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, and `EMAIL_FROM` (and optionally `EMAIL_ADMIN_NOTIFY`) as server-side environment variables in the target Vercel environment. Use a stable preview origin and separate database for preview testing. Configure TLS in the production PostgreSQL connection string according to the database provider; certificate verification is not disabled by the application.

Run `pnpm db:migrate` against the target database before deploying, approve an organiser, then run `pnpm build` and deploy through the existing Vercel workflow. A successful build does not provision a database, configure email delivery, or deploy the site. Use `pnpm dev` for local API testing; the Vercel adapter does not provide a local `astro preview` server.

Integration references: [Better Auth with Astro](https://better-auth.com/docs/integrations/astro), [email OTP](https://better-auth.com/docs/plugins/email-otp), and [Astro's Vercel adapter](https://docs.astro.build/en/guides/integrations-guide/vercel/).

## Tests

Create a separate PostgreSQL database named `duckies_test` (or `duckies_test_<suffix>`). With the local Docker service:

```sh
docker compose exec db createdb -U duckies duckies_test
pnpm exec playwright install chromium
TEST_DATABASE_URL=postgresql://duckies:duckies@localhost:54329/duckies_test pnpm test
```

Tests reset that database, apply migrations, and run the real Astro server on port 4329. Sign-in emails are intercepted inside the test server; they never reach Resend. There is no production test-login endpoint or fixed OTP. Coverage includes anonymous access, forged cookies, unapproved accounts, organiser permissions, cross-origin writes, persisted roster changes, OTP expiry/replay/attempt limits, rate limits, revoked access, mobile UI, and logout. Shop coverage includes draft visibility, isolated order access, simultaneous reservations, idempotent retries, cancellation, payment recording, email failure, customer sign-in, and additive seeding. Screenshots and failure traces go to the ignored `test-results/` directory.

## Notes

- Project media used by the site lives in `public/media`.
- Use the Node version in `.nvmrc` and the pnpm version pinned in `package.json`.

## Child registration, signed waivers, and payments

The organiser's kids overview includes date of birth / age, multiple legal guardians, emergency contact, medical notes, training rhythm (one or two sessions a week), media consent, swimming / reef / gear / parent-in-water acknowledgements, signed waiver, and semester payment status. Regular club members continue to receive only the basic name list. Shop-only accounts receive neither roster nor family details. Semesters and their fees live in the shared database; the waiver text and version live in `src/lib/registration/policy.ts`. Review and version the waiver explicitly when changing the policy.

Registration comes before payment. Families register themselves from `/join` (`POST /api/club/join`): the kid is created as *pending*, a private link is issued for the current semester and the family continues straight to the form. An organiser can also add a kid and **Generate registration link** from the roster at any time; choose **Copy link** or **Send via WhatsApp**. The kid becomes a *member* once the registration is signed **and** the current semester is marked paid — and only `andras@hejj.xyz` can record payments (cash or transfer, confirmed by hand). Sign-in access is separate and also granted by hand: each guardian email on a signed registration gets an **Approve sign-in** button in the kid's overview (`POST`/`DELETE /api/members`); payment never grants access on its own. Anonymous sign-ups are rate limited to 8 per 10 minutes per address. The latter opens a message for you to send; the app does not send WhatsApp messages itself. Links use 256-bit random tokens, with only their hashes stored in the database. Tokens travel in the URL fragment, not query strings or page requests, so link previews and ordinary server access logs do not receive them. The invitation expires after 14 days. Generating another link revokes prior links for that child and semester; the organiser can also revoke a link directly. Do not log request Authorization headers or signing bodies in external infrastructure.

The guardian opens `/register`, supplies the child and family details, reads the existing club waiver, makes an explicit yes/no media choice, and signs with their typed name (optionally adding a drawing). No login or automatic club membership is granted. Safety acknowledgements and electronic-signature consent must be affirmative. Every signature is an immutable record. While the link is valid (14 days) the guardian can reopen it, correct details, and sign again; the new record names the one it replaces (`snapshot.evidence.supersedes`) and the roster shows the latest. A replayed first submission on a signed link is rejected (HTTP 409); a fresh link never prefills from earlier records. Kids must be at least 7 (`MINIMUM_AGE` in `policy.ts`); membership covers training only and there is no division or club rashie. Registration cannot alter payment status.

**Cup registration** reuses the same form. The Cup is its own term (`cup-vol-2`, seeded by migration with the Rs 1,000 entry fee; constants in `src/lib/registration/cup.ts`). On `/sunset-duckies-cup-vol-2` a member family signs in (`/login?next=…`) with the email on their club registration; `GET /api/cup/kids` lists only the kids whose latest signed registration names that email, and `POST /api/cup/kids/:id` puts one on the list — no form, no waiver. The entry is free while the kid is a member (signed + current semester paid); otherwise the roster shows the Rs 1,000 fee. A new family uses the short form (`POST /api/cup/register`): kid row, cup entry and a self-issued private link to `/register` for the cup term; the entry fee is recorded like a semester payment under the Cup term. If the name + number already belong to a kid with a signed club registration, the family is told to sign in instead. Cup links hide the membership-only parts of the form and do not require a training rhythm. The roster flags entries as **Cup 02** and offers a "Coming to the Cup" filter.

Signed records store the exact registration and waiver text, version, server UTC time, link issue time, supplied guardian identity, browser user agent, IP address, typed/drawn signature, and PDF bytes in the **same PostgreSQL database**. The PDF and canonical payload have SHA-256 hashes sealed with an Ed25519 application key. The club's seal is a detached record-integrity signature, not an embedded PDF certificate signature, a DocuSign identity verification, or a guarantee about legal enforceability. The guardian's identity is self-declared and possession of the invitation link is the authentication factor. The waiver wording is carried over from the existing club form, not newly legally reviewed.

Set `WAIVER_SIGNING_PRIVATE_KEY` (base64 PKCS8 DER Ed25519 key; generation command in `.env.example`) before generating invitations. Back up this key and the database securely, enable your database provider's encryption and backup retention, and restrict production SQL access. Signed rows and payment events reject SQL UPDATE/DELETE via triggers; the database owner still controls its own infrastructure. Key rotation works for future signatures because each record retains its verification public key. Organisers can download the exact stored PDF and JSON signature record; the guardian's link allows downloads for one hour after signing. Verify an exported pair with:

```sh
pnpm exec tsx scripts/verify-waiver.ts signed-waiver.pdf signature-record.json
```

Removing a child archives them. Records remain accessible from **Archived kids and signed records**. Corrections append a new signed version. Payment changes append a dated history entry and require a verified organiser session for **andras@hejj.xyz**; other organisers cannot change either membership payment status or mark shop orders paid. Amounts can remain unknown and every change requires a note. A reported payment is not automatic bank reconciliation.

For trusted local administrative imports, `scripts/import-kid.ts` reads a private JSON file with `name`, `contactName`, `contactPhone`, and `payment: { term, status, amountMur, note }` (for example, `term: "2026-S2"`). This is a local operator command, not an HTTP endpoint, and records the action as Andras. Keep real child / payment import files outside Git (for example `.local-data/`). It does not invent a legal-guardian relationship, date of birth, payment amount/date, or signature. Repeating the same import avoids duplicate payment events.

Local development data for this checkout is in the ignored `.local-data/postgres` PostgreSQL cluster on `127.0.0.1:54329`; `duckies_dev` contains development records and `duckies_test` is reserved for destructive tests. Start/stop this cluster with your PostgreSQL `pg_ctl -D "$PWD/.local-data/postgres"` commands; do not run Docker Compose on the same port concurrently. Local and production databases are separate. The supplied payment record has been deliberately imported into production; future local changes do not sync automatically.

## Cup day: heats, judges and the live leaderboard

`/admin/cup` is the organisers' board for the Cup Vol. 02 (`cup-vol-2`; the edition, rounds, heat size and final size live in `cup_event`). Every kid with a `club_cup_entry` is in the draw, with their age from the latest signed form. **Draw round 1** lines the kids up by age so the youngest surf together, in heats as even as the numbers allow (14 kids in heats of 4 is 4-4-3-3). Every later round is shuffled, keeping kids who already shared a heat apart where possible and rotating rashie colours, and every kid surfs exactly once per round. Organisers drag kids between heats (or use the menus on a phone), change a kid's rashie, take a kid out of a round, and **Start** / **Finish** each heat. **Build the final** takes the top of the leaderboard as it stands. A round can be redrawn or deleted until a judge has scored a heat in it; a kid with scores in a heat stays in that heat.

Parents sign in at `/cup/judge` using the email on their child’s latest signed registration, then tap **Volunteer to judge this heat**. Organisers see the request on the heat card with the parent’s name, private photo, phone and linked children, and can approve or decline it. Approval unlocks the scoring sheet automatically when that heat starts. Each heat needs its own approval; judging never carries over to the next heat. Manual email invitations and per-heat selection remain available for other judges, including organisers. Signed-out visitors and signed-in spectators can watch the public board on the same page.

Registration captures each guardian’s name, relationship, phone and email, with an optional private portrait. On signing, profiles and staged photos are committed together; unsigned or removed guardians do not create profiles. Corrections can update profiles created through the same link, but preserve authenticated profile edits. **Admin → Parents** (`/admin/parents`) provides a searchable, automatically refreshed table with photos, contacts and linked children.

The miniapp’s **Your parent profile** form lets adults save their name, phone and a JPEG/PNG/WebP portrait up to 4 MB. The organisers’ **Parents & volunteers** directory also allows adding or replacing photos. Initial contact details and family relationships come from the latest signed child registrations; editing an adult profile never changes a signed waiver. Parent details and photos are accessible only to that adult and organisers, never the public feed.

Each heat defaults to **10 minutes**, configurable from 1–60 minutes before starting. **Start heat** records a database deadline; duplicate starts do not restart the clock, and the duration cannot change during a heat. All open views show the countdown with one-minute and 30-second warning toasts. Scoring, corrections and deletion stop at the deadline or when the organiser finishes early. The API checks the deadline on every write; the phone also disables its controls locally if polling loses connection. Elapsed heats are marked finished and their results posted once on the next feed read, without requiring an organiser’s tab to stay open.

Rate each run with **1–5 whole stars**. Judges agree on each kid’s run number; the run selector lets a judge catch up on a missed ride without shifting subsequent ratings. The app averages the judges’ ratings of the same run first, then averages the best two runs for the heat. The overall leaderboard takes the best two runs across all qualifying heats; the final is scored separately. Only scored runs count (one 5-star run gives 5); no ratings shows a dash in the heat. Equal averages use the best single run as a tiebreak, with shared ranks if both match. Results remain provisional as ratings arrive.

Judges can edit or delete only their own ratings while selected and while that heat is running. Removing a heat assignment immediately blocks all three score mutations; saved ratings remain in the results. Removing an invitation also removes every heat assignment. Permissions are enforced in the API, including for organisers.

`/sunset-duckies-cup-vol-2/live` is the public board: a ticker, the heat in the water with a clock, the overall leaderboard and a tableau of **all** heats (scheduled, running and finished). Both it and the organiser board refresh every three seconds. `/api/cup/live` returns only the Cup’s name until an organiser switches **Leaderboard is LIVE** on. The public feed carries roster names, ages, colours and scores, never private photos, contact details or judge emails. The public board shows a reconnecting message if an update fails.

Deploy the `20260920120000_cup_heat_judges_stars` migration before the app. It starts all heat assignments empty and adds the database constraint for whole 1–5-star ratings. Also deploy `20260920150000_cup_volunteers_and_clock` for parent profiles, requests and deadlines, and `20260920170000_registration_parents` for registration photo staging and profile ownership. The first migration deliberately refuses to migrate a database containing existing wave scores: export and review any old ten-point scores before resolving them, rather than silently reinterpreting them as stars.

## Semester payments and profile photos

The organiser overview has a **Payment semester** selector. Each semester has its own payment status and append-only history; an existing child's profile, latest signed waiver, and photo remain available when switching semesters. A new semester starts with no payment recorded for each child. This does not charge families automatically or carry a previous payment forward.

Only **andras@hejj.xyz** can add semesters, make one current, or change payments. Add the semester ID, name, per-child and family fees, and optional dates, then explicitly make it current when ready. Dates do not automatically switch the current semester. Fees are reference amounts; the recorded payment amount remains manual, including unknown amounts and family-payment allocation notes. Existing payments remain in `2026-S2` (September 2026). Registration links retain the semester and fees they were issued for, and payment forms always submit their selected semester.

Organisers can upload, replace, or remove a child's profile photo. Guardians can optionally upload one through their private registration link; it becomes the profile photo only when they complete signing. Photos remain private to organisers, separate from the signed waiver and publication/media consent. Regular members and shop customers cannot retrieve them. This provides a profile photo for future social features without publishing children's images now.

Uploads accept JPEG, PNG, or WebP up to 4 MiB and 20 megapixels. The server validates and re-encodes each image as a 512-pixel square WebP, removing original metadata; original uploads are not retained. Photos and pending registration uploads use the same PostgreSQL database and backup policy as club records. Removing or replacing a photo does not alter a signed waiver. A signed link can stage a replacement photo, which reaches the profile only with the corrected signature; expired and revoked links are rejected, and their pending uploads are cleaned up on a subsequent guardian photo update.

Production is the Vercel project `sunsetduckies` in `andras-projects-f72091f7`, using `https://www.sunsetduckies.com` as the authentication origin. Its dedicated Neon database is `sunsetduckies-production` in Frankfurt, connected only to the production environment. September 2026 fees are MUR 3,000 per child / MUR 5,000 per family in both databases and public copy. Production auth and waiver keys are separate from local development. Private operator configuration and key backups for this checkout are under the ignored `.local-data/` directory; never commit or upload it.
