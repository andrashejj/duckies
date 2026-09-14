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
- `/api/auth/*` — Better Auth endpoints (server-rendered)
- `/api/kids` — authenticated roster; organisers can add kids
- `/api/kids/:id` — organisers can rename or remove kids

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

The landing page stays static. After sign-in it loads the kids list from a private API. Kids’ names are never embedded in public HTML or JavaScript bundles. The API validates the session and current membership on every request, sets `no-store` headers for browsers and CDNs, and permits only organisers to change the roster. The roster starts empty; no competition entries are imported automatically.

1. Run `docker compose up -d` for a dedicated local PostgreSQL database on port 54329, or provision a dedicated PostgreSQL database yourself.
2. Add the variables from `.env.example` to your local `.env`, preserving any existing configuration. `DUCKIES_DATABASE_URL` is deliberately separate from legacy `DATABASE_URL`. Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. Set `BETTER_AUTH_URL` to the exact site origin (`http://localhost:4321` locally).
3. Configure `RESEND_API_KEY` and `EMAIL_FROM` with a verified Resend sender. Sign-in uses six-digit codes valid for ten minutes. Codes are hashed in the database, have three attempts, and requests are rate limited using shared database storage.
4. Run `pnpm db:migrate`. This applies Better Auth's additive migrations and creates the club tables. Run it again when upgrading Better Auth. Do not run against a shared application database or a PostgreSQL template database.
5. Approve the first organiser with `pnpm member add you@example.com organiser`, then add parents with `pnpm member add parent@example.com`. These commands manage access without sending email. Removing a member also revokes their existing sessions.
6. Run `pnpm dev`, open `/login`, and request a code. Once signed in, organisers can add, edit, and remove names directly on the landing page. Store only the name used at the club; first name plus surname initial is usually enough.

Club-approved email addresses and customers with an existing reservation can request sign-in codes. Unknown email addresses receive the same acknowledgement but no email. Shop customers can view their own reservations; they cannot access the roster or administration. Approval is required independently of authentication, so a removed member cannot use a still-valid session to read it.

## Shop and shared backend

The reservation shop from `claude/webshop-admin-panel` is integrated into the same Astro application. `/shop`, `/shop/:slug`, `/orders/:id`, `/account`, and `/admin` render on the server. The landing page and existing public content remain static.

Better Auth owns the `user`, `session`, `account`, and `verification` tables. Prisma manages shop queries and references the **same** `user` IDs, using the **same** PostgreSQL connection pool from `src/lib/server/db.ts`. There is no separate Auth.js/Google login, admin user table, database URL, or backend deployment. The Prisma schema is a query model for shop tables and the shared user table; do **not** use `prisma db push` or automatic Prisma migrations against this database because those tools do not own the full auth/club schema. Use `pnpm db:migrate` for the checked-in SQL migrations and `pnpm db:generate` after editing the Prisma model. The generated client is ignored and rebuilt by `pnpm install`, rather than checked in.

- Guests can reserve available products and receive a private receipt link. Customers can sign in with their reservation email to see their own history at `/account/orders`.
- Club members can use their existing sign-in for shop accounts and the kids list. Only the `organiser` role in `club_member` grants `/admin` access.
- Organisers manage drops, products, reservations, cash collection, and internal notes. Internal notes are never included in customer emails.
- Draft, closed, future, and expired drops are excluded from both catalogue queries and reservations. Closing a drop preserves its product associations.
- Inventory is reserved within a transaction; repeated request IDs return the same order. Cancellation restores deducted stock once. Prices and valid sizes come from the database.
- Reservations are not online payments. Customer confirmation and status emails use the same sender as login codes. Set `EMAIL_ADMIN_NOTIFY` for organiser alerts. If email delivery fails, the receipt accurately says that the reservation was saved but the email was not sent.

Run `pnpm db:seed` to add the original eight product concepts and their images to a **draft** Drop 001. Re-running it preserves edits and other products; it never publishes, resets prices, or archives unrelated products. Sign in as an organiser, review the sizes, prices, stock, and descriptions at `/admin`, then mark the drop live when it is ready. Current pickup copy uses Monday/Friday sessions.

Migrations are recorded in `club_migration` and run under a database lock. An old Auth.js database with an uppercase `User` table is deliberately rejected before changes: existing shop data requires a reviewed export/import into the shared database, including mapping old user IDs to the Better Auth users. No legacy or production database has been migrated by this implementation.

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

The organiser's kids overview includes date of birth / age, multiple legal guardians, emergency contact, medical notes, rashie details, media consent, swimming / gear / parent-in-water acknowledgements, signed waiver, and semester payment status. Regular club members continue to receive only the basic name list. Shop-only accounts receive neither roster nor family details. The active semester and waiver version live in `src/lib/registration/policy.ts`; review these explicitly before a new semester or policy change.

For each child, choose **Generate registration link**, then **Copy link** or **Send via WhatsApp**. The latter opens a message for you to send; the app does not send WhatsApp messages itself. Links use 256-bit random tokens, with only their hashes stored in the database. Tokens travel in the URL fragment, not query strings or page requests, so link previews and ordinary server access logs do not receive them. The invitation expires after 14 days. Generating another link revokes prior links; the organiser can also revoke a link directly. Do not log request Authorization headers or signing bodies in external infrastructure.

The guardian opens `/register`, supplies the child and family details, reads the existing club waiver, makes an explicit yes/no media choice, and signs with their typed name (optionally adding a drawing). No login or automatic club membership is granted. Safety acknowledgements and electronic-signature consent must be affirmative. A signature authorises one immutable submission; another link is needed for corrections. The original signed record remains available. Registration cannot alter payment status.

Signed records store the exact registration and waiver text, version, server UTC time, link issue time, supplied guardian identity, browser user agent, IP address, typed/drawn signature, and PDF bytes in the **same PostgreSQL database**. The PDF and canonical payload have SHA-256 hashes sealed with an Ed25519 application key. The club's seal is a detached record-integrity signature, not an embedded PDF certificate signature, a DocuSign identity verification, or a guarantee about legal enforceability. The guardian's identity is self-declared and possession of the invitation link is the authentication factor. The waiver wording is carried over from the existing club form, not newly legally reviewed.

Set `WAIVER_SIGNING_PRIVATE_KEY` (base64 PKCS8 DER Ed25519 key; generation command in `.env.example`) before generating invitations. Back up this key and the database securely, enable your database provider's encryption and backup retention, and restrict production SQL access. Signed rows and payment events reject SQL UPDATE/DELETE via triggers; the database owner still controls its own infrastructure. Key rotation works for future signatures because each record retains its verification public key. Organisers can download the exact stored PDF and JSON signature record; the guardian's link allows downloads for one hour after signing. Verify an exported pair with:

```sh
pnpm exec tsx scripts/verify-waiver.ts signed-waiver.pdf signature-record.json
```

Removing a child archives them. Records remain accessible from **Archived kids and signed records**. Corrections append a new signed version. Payment changes append a dated history entry and require a verified organiser session for **andras@hejj.xyz**; other organisers cannot change either membership payment status or mark shop orders paid. Amounts can remain unknown and every change requires a note. A reported payment is not automatic bank reconciliation.

For trusted local administrative imports, `scripts/import-kid.ts` reads a private JSON file with `name`, `contactName`, `contactPhone`, and `payment: { status, amountMur, note }`. This is a local operator command, not an HTTP endpoint, and records the action as Andras. Keep real child / payment import files outside Git (for example `.local-data/`). It does not invent a legal-guardian relationship, date of birth, payment amount/date, or signature. Repeating the same import avoids duplicate payment events.

Local development data for this checkout is in the ignored `.local-data/postgres` PostgreSQL cluster on `127.0.0.1:54329`; `duckies_dev` contains development records and `duckies_test` is reserved for destructive tests. Start/stop this cluster with your PostgreSQL `pg_ctl -D "$PWD/.local-data/postgres"` commands; do not run Docker Compose on the same port concurrently. These local records are not production data and must be deliberately imported when deploying.
