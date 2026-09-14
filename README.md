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
- `/login` — sign in with a club-approved email address
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

The landing page stays static. After sign-in it loads the kids list from a private API. Names are never embedded in public HTML or JavaScript bundles. The API validates the session and current membership on every request, sets `no-store` headers for browsers and CDNs, and permits only organisers to change the roster. The roster starts empty; no competition entries are imported automatically.

1. Run `docker compose up -d` for a dedicated local PostgreSQL database on port 54329, or provision a dedicated PostgreSQL database yourself.
2. Add the variables from `.env.example` to your local `.env`, preserving any existing configuration. `DUCKIES_DATABASE_URL` is deliberately separate from legacy `DATABASE_URL`. Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. Set `BETTER_AUTH_URL` to the exact site origin (`http://localhost:4321` locally).
3. Configure `RESEND_API_KEY` and `EMAIL_FROM` with a verified Resend sender. Sign-in uses six-digit codes valid for ten minutes. Codes are hashed in the database, have three attempts, and requests are rate limited using shared database storage.
4. Run `pnpm db:migrate`. This applies Better Auth's additive migrations and creates the club tables. Run it again when upgrading Better Auth. Do not run against a shared application database or a PostgreSQL template database.
5. Approve the first organiser with `pnpm member add you@example.com organiser`, then add parents with `pnpm member add parent@example.com`. These commands manage access without sending email. Removing a member also revokes their existing sessions.
6. Run `pnpm dev`, open `/login`, and request a code. Once signed in, organisers can add, edit, and remove names directly on the landing page. Store only the name used at the club; first name plus surname initial is usually enough.

Unknown email addresses receive the same code-request acknowledgement but no email. They cannot create an account or access the roster. Approval is required independently of authentication, so a removed member cannot use a still-valid session to read it.

## Deployment

The Vercel adapter preserves static public pages and deploys the API as Node functions. Set `DUCKIES_DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, and `EMAIL_FROM` as server-side environment variables in the target Vercel environment. Use a stable preview origin and separate database for preview testing. Configure TLS in the production PostgreSQL connection string according to the database provider; certificate verification is not disabled by the application.

Run `pnpm db:migrate` against the target database before deploying, approve an organiser, then run `pnpm build` and deploy through the existing Vercel workflow. A successful build does not provision a database, configure email delivery, or deploy the site. Use `pnpm dev` for local API testing; the Vercel adapter does not provide a local `astro preview` server.

Integration references: [Better Auth with Astro](https://better-auth.com/docs/integrations/astro), [email OTP](https://better-auth.com/docs/plugins/email-otp), and [Astro's Vercel adapter](https://docs.astro.build/en/guides/integrations-guide/vercel/).

## Tests

Create a separate PostgreSQL database named `duckies_test` (or `duckies_test_<suffix>`). With the local Docker service:

```sh
docker compose exec db createdb -U duckies duckies_test
pnpm exec playwright install chromium
TEST_DATABASE_URL=postgresql://duckies:duckies@localhost:54329/duckies_test pnpm test
```

Tests reset that database, apply migrations, and run the real Astro server on port 4329. Sign-in emails are intercepted inside the test server; they never reach Resend. There is no production test-login endpoint or fixed OTP. Coverage includes anonymous access, forged cookies, unapproved accounts, organiser permissions, cross-origin writes, persisted roster changes, OTP expiry/replay/attempt limits, rate limits, revoked access, mobile UI, and logout. Screenshots and failure traces go to the ignored `test-results/` directory.

## Notes

- Project media used by the site lives in `public/media`.
- Use the Node version in `.nvmrc` and the pnpm version pinned in `package.json`.
