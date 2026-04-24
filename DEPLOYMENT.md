# Deployment

Sunset Duckies runs as an Astro SSR app on **Vercel**, with a **Neon Postgres**
database accessed via **Prisma**.

## One-time setup

### 1. Neon

1. Create a Neon project (region `aws-eu-central-1` recommended for Mauritius latency).
2. Create two branches or grab two connection strings from the project:
   - **Pooled** (`...-pooler...`) → `DATABASE_URL`
   - **Direct** (no `-pooler`) → `DIRECT_URL`
3. Copy both into `.env` locally and into the Vercel project's **Environment
   Variables** (Production + Preview + Development).

### 2. Vercel

1. Import the GitHub repo into Vercel. Framework preset: **Astro**.
2. Set the env vars from `.env.example` (only the ones that apply to the
   current PR's scope).
3. Build Command: `npm run build` (the default — `postinstall` runs
   `prisma generate`).
4. Ensure the Vercel project's Node version is ≥ 22.12 (repo's `engines` field
   enforces this).

### 3. Database migration

The first time (and on every schema change):

```bash
# Locally — develop a new migration against your dev Neon branch
npm run db:migrate -- --name init

# Seed the catalogue
npm run db:seed
```

In Vercel (prod), migrations are applied at deploy time. Add this to the Vercel
**Build Command** when you're ready to enable it:

```bash
prisma migrate deploy && astro build
```

We keep it as `npm run build` for now so CI doesn't depend on DB reachability
during early PRs — flip to `db:deploy && build` once Neon is wired up.

### 4. Seeding production

Run once after first prod deploy, against the prod Neon branch:

```bash
DATABASE_URL="<prod pooled>" DIRECT_URL="<prod direct>" npm run db:seed
```

Or use the Vercel "Run one-off" / a protected serverless endpoint later.

## Local development

```bash
npm install                    # also runs `prisma generate`
cp .env.example .env           # fill DATABASE_URL + DIRECT_URL
npm run db:migrate             # first time only
npm run db:seed                # first time only
npm run dev
```

Without `DATABASE_URL`, `/shop` renders a graceful fallback ("Kit temporarily
off the rack") — but you should just wire up a Neon dev branch, it takes 2min.

## Resend (transactional email)

1. Create a Resend account and verify `sunsetduckies.com` as a sending domain
   (adds SPF, DKIM, and DMARC DNS records).
2. Create an API key with **Send access** (not full admin).
3. Set `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_ADMIN_NOTIFY` in `.env` and Vercel.
4. Without these values the checkout API still persists orders and returns
   success — it just logs a warning and skips the email. Safe to deploy before
   DNS finishes propagating.

Templates live in `src/emails/*.tsx` as React Email components. Preview with:

```bash
# Add later if you want live previews:
# npx email dev
```

## What lands in later PRs

- **PR 3** — Auth.js + Google. Adds `AUTH_SECRET`, `AUTH_GOOGLE_ID`,
  `AUTH_GOOGLE_SECRET`, `AUTH_TRUST_HOST`. Google Cloud OAuth client needs
  these redirect URIs:
  - `https://sunsetduckies.com/api/auth/callback/google`
  - `https://<vercel-preview>/api/auth/callback/google` (optional, for previews)
  - `http://localhost:4321/api/auth/callback/google` (dev)
- **PR 4** — Admin panel at `/admin`, gated to `role=ADMIN` (anyone signing in
  with an `@sunsetduckies.com` Google account). Status transitions, payment
  confirmation, and additional templates (PaymentConfirmed, Ready, Fulfilled,
  Cancelled) land here.
- **PR 5** — Members section + polish.
