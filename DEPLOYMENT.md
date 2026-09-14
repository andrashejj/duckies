# Sunset Duckies deployment

Deploy the club, members area, reservation shop, and admin panel as one Vercel Astro app. They share Better Auth sessions and one PostgreSQL database.

1. Provision a dedicated PostgreSQL database and set `DUCKIES_DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, and `EMAIL_FROM` in the target environment. `BETTER_AUTH_URL` must be the exact HTTPS origin. Add `EMAIL_ADMIN_NOTIFY` for shop alerts.
2. Install with `pnpm install --frozen-lockfile`; postinstall generates the Prisma query client without requiring a live database.
3. With the target environment loaded, run `pnpm db:migrate`. This creates auth tables and applies the versioned club/shop SQL. It does not seed products or assign access.
4. Approve an organiser with `pnpm member add you@example.com organiser`. Existing approved members use the same login for the shop and kids list.
5. Optionally run `pnpm db:seed` to restore the original product concepts as drafts. Review them in `/admin` before setting a drop live.
6. Run `pnpm check` and `pnpm build`, then deploy using the existing Vercel workflow. For tests, use the separate `TEST_DATABASE_URL` described in README.md.
7. Verify the deployed `/shop`, a live product, guest reservation and receipt, customer email-code login, organiser administration, and unauthenticated rejection from `/api/kids`. Confirm actual email delivery with the configured sender.

Use a separate preview database and a stable preview origin. Never point preview tests at production. Public club content stays prerendered; authenticated API responses, order receipts, accounts, and admin pages disable browser/CDN caching. Private receipt links also disable referrer forwarding.

The legacy Auth.js/Google configuration is obsolete. Do not set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, or `AUTH_SECRET` for this app. Do not use `DATABASE_URL`, `DIRECT_URL`, `prisma db push`, or the old `db:deploy` command. All runtime queries use `DUCKIES_DATABASE_URL`; checked-in SQL is applied by `pnpm db:migrate`.

If an old shop database contains real data, keep it intact. The migration command refuses legacy uppercase `User` tables. Review an export/import and user-ID mapping into the shared backend before switching traffic; this code change does not import or alter any live legacy database.

Child registration additionally requires `WAIVER_SIGNING_PRIVATE_KEY` before invitations can be issued. Apply `003-registration.sql` through `pnpm db:migrate`, deploy the updated app and bundled PDF font, then verify a complete private-link signing flow and download the persisted PDF plus integrity record. Configure managed PostgreSQL backups and encryption; PDFs and audit records live in the database rather than ephemeral function storage. Do not deploy the local `.local-data` directory or real import JSON files. The local reported-payment record must be deliberately imported into the target database if it should appear there. The initial supplied payment has now been imported into the dedicated production database. No WhatsApp message is sent by deployment.

Semester tracking and profile photos additionally require `004-semesters-photos.sql`, applied through the same migration command before deploying the updated app. This preserves existing payments under their original semester and seeds September 2026 as current. The Node function bundle includes Sharp for image validation and processing. Photos live in PostgreSQL; no public bucket or extra storage credentials are needed. Verify semester switching preserves old payment statuses, only Andras can change them, and a private registration upload appears on the organiser overview after signing. Include photo tables in database backups.

The production database has been provisioned as `sunsetduckies-production` (Neon free plan, Frankfurt), and migrations 001–004 have been applied. Runtime credentials are configured on the Vercel production environment; keep preview and development disconnected from this database. The canonical auth origin is `https://www.sunsetduckies.com`. Migration commands should use the provider's unpooled connection, with `sslmode=verify-full`; runtime uses the pooled connection with the same TLS verification. The shop's founding catalogue is seeded as drafts for organiser review.

`vercel.json` places the Node functions in Frankfurt alongside the database. Production deployments build from Git on Vercel; do not upload the locally built macOS Sharp binaries as a prebuilt Linux deployment.
