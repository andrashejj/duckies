-- Baseline: the Sunset Duckies database as it stood on 17 September 2026,
-- when schema management moved from db/*.sql + scripts/db-migrate.ts to
-- Prisma Migrate. It is the Better Auth tables followed by the eleven club
-- migrations, verbatim and in order, so it carries what prisma/schema.prisma
-- cannot say: CHECK constraints, the triggers that make signed waivers and
-- payment events immutable, and the seed rows (semesters, pre-approved
-- branding editors). Existing databases were marked as having applied it with
-- `prisma migrate resolve --applied 20260917000000_baseline`.

-- ---------- Better Auth (compiled from better-auth/db/migration) ----------
create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);

create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "rateLimit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);

create index "session_userId_idx" on "session" ("userId");

create index "account_userId_idx" on "account" ("userId");

create index "verification_identifier_idx" on "verification" ("identifier");
-- ---------- 001-club.sql ----------
CREATE TABLE IF NOT EXISTS club_member (
  email text PRIMARY KEY CHECK (email = lower(trim(email))),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'organiser')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS club_kid (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  created_by text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- 002-shop.sql ----------
-- Shop tables reference Better Auth user IDs. Auth tables are managed separately.
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('APPAREL', 'HEADWEAR', 'ACCESSORIES', 'BOARD_CARE', 'STATIONERY', 'BUNDLE');

-- CreateEnum
CREATE TYPE "DropStatus" AS ENUM ('DRAFT', 'LIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'READY', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PickupMethod" AS ENUM ('SESH', 'ARRANGE');

-- CreateEnum
CREATE TYPE "OrderEventType" AS ENUM ('CREATED', 'CONFIRMED', 'READY', 'FULFILLED', 'CANCELLED', 'PAID', 'NOTE', 'EMAIL_SENT');

-- CreateTable
CREATE TABLE "Drop" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "DropStatus" NOT NULL DEFAULT 'DRAFT',
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "pickupNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MUR',
    "category" "ProductCategory" NOT NULL,
    "sizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "colorway" TEXT NOT NULL DEFAULT 'ink',
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "stock" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dropId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "guestToken" TEXT NOT NULL,
    "confirmationEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "requestKey" TEXT,
    "requestHash" TEXT,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "pickupMethod" "PickupMethod" NOT NULL DEFAULT 'SESH',
    "pickupNote" TEXT,
    "customerNote" TEXT,
    "internalNotes" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MUR',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "priceCentsSnapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "size" TEXT,
    "kidName" TEXT,
    "lineTotalCents" INTEGER NOT NULL,
    "stockReserved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "OrderEventType" NOT NULL,
    "message" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Drop_slug_key" ON "Drop"("slug");

-- CreateIndex
CREATE INDEX "Drop_status_sortOrder_idx" ON "Drop"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_active_sortOrder_idx" ON "Product"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_dropId_idx" ON "Product"("dropId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Order_guestToken_key" ON "Order"("guestToken");

-- CreateIndex
CREATE UNIQUE INDEX "Order_requestKey_key" ON "Order"("requestKey");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_email_idx" ON "Order"("email");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "Order_paidAt_idx" ON "Order"("paidAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_dropId_fkey" FOREIGN KEY ("dropId") REFERENCES "Drop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Runtime invariants in addition to request validation.
ALTER TABLE "Product" ADD CONSTRAINT "Product_stock_nonnegative" CHECK (stock IS NULL OR stock >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_nonnegative" CHECK ("priceCents" >= 0);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_positive" CHECK (quantity > 0);
CREATE TABLE shop_request_limit (
  key text PRIMARY KEY,
  count integer NOT NULL,
  reset_at timestamptz NOT NULL
);

-- ---------- 003-registration.sql ----------
ALTER TABLE club_kid ADD COLUMN archived_at timestamptz;
ALTER TABLE club_kid ADD COLUMN contact_name text;
ALTER TABLE club_kid ADD COLUMN contact_phone text;

CREATE TABLE club_registration_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id uuid NOT NULL REFERENCES club_kid(id),
  token_hash text NOT NULL UNIQUE,
  term text NOT NULL,
  created_by text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX club_registration_link_kid ON club_registration_link(kid_id, created_at DESC);

CREATE TABLE club_signed_waiver (
  id uuid PRIMARY KEY,
  kid_id uuid NOT NULL REFERENCES club_kid(id),
  link_id uuid NOT NULL UNIQUE REFERENCES club_registration_link(id),
  term text NOT NULL,
  signed_at timestamptz NOT NULL,
  snapshot jsonb NOT NULL,
  canonical_payload text NOT NULL,
  payload_sha256 text NOT NULL,
  pdf bytea NOT NULL,
  pdf_sha256 text NOT NULL,
  seal text NOT NULL,
  public_key text NOT NULL
);
CREATE INDEX club_signed_waiver_kid ON club_signed_waiver(kid_id, signed_at DESC);

CREATE TABLE club_payment_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id uuid NOT NULL REFERENCES club_kid(id),
  term text NOT NULL,
  status text NOT NULL CHECK (status IN ('paid', 'unpaid')),
  amount_mur numeric(10,2) CHECK (amount_mur >= 0),
  note text NOT NULL,
  actor_email text NOT NULL CHECK (actor_email = 'andras@hejj.xyz'),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX club_payment_event_kid ON club_payment_event(kid_id, term, recorded_at DESC);

CREATE FUNCTION protect_club_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Club signed records and payment history are append-only'; END $$;
CREATE TRIGGER immutable_waiver BEFORE UPDATE OR DELETE ON club_signed_waiver FOR EACH ROW EXECUTE FUNCTION protect_club_record();
CREATE TRIGGER immutable_payment BEFORE UPDATE OR DELETE ON club_payment_event FOR EACH ROW EXECUTE FUNCTION protect_club_record();

-- ---------- 004-semesters-photos.sql ----------
CREATE TABLE club_semester (
  id text PRIMARY KEY CHECK (id ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,39}$'),
  label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 100),
  starts_on date,
  ends_on date,
  child_fee_mur numeric(10,2) NOT NULL CHECK (child_fee_mur >= 0),
  family_fee_mur numeric(10,2) NOT NULL CHECK (family_fee_mur >= 0),
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on)
);
CREATE UNIQUE INDEX one_current_club_semester ON club_semester(is_current) WHERE is_current;
INSERT INTO club_semester (id,label,starts_on,child_fee_mur,family_fee_mur,is_current)
VALUES ('2026-S2','September 2026 semester','2026-09-11',3000,5000,true);
-- Preserve all legacy term references without rewriting immutable signed/payment rows.
INSERT INTO club_semester (id,label,child_fee_mur,family_fee_mur)
SELECT term,term,3000,5000 FROM (
  SELECT term FROM club_payment_event UNION SELECT term FROM club_registration_link UNION SELECT term FROM club_signed_waiver
) history ON CONFLICT (id) DO NOTHING;
ALTER TABLE club_payment_event ADD FOREIGN KEY (term) REFERENCES club_semester(id);
ALTER TABLE club_registration_link ADD FOREIGN KEY (term) REFERENCES club_semester(id);
ALTER TABLE club_signed_waiver ADD FOREIGN KEY (term) REFERENCES club_semester(id);

CREATE TABLE club_kid_photo (
  kid_id uuid PRIMARY KEY REFERENCES club_kid(id),
  image bytea NOT NULL CHECK (octet_length(image) <= 1048576),
  updated_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by text REFERENCES "user"(id),
  source text NOT NULL CHECK (source IN ('organiser','guardian'))
);
CREATE TABLE club_registration_photo (
  link_id uuid PRIMARY KEY REFERENCES club_registration_link(id),
  image bytea NOT NULL CHECK (octet_length(image) <= 1048576),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- 005-granola.sql ----------
-- Shared product-development recipes, independent of shop and club finances.
CREATE TABLE granola_pack (
  id text PRIMARY KEY CHECK (id IN ('basic', 'sports', 'champ')),
  recipe jsonb NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL
);
CREATE TABLE granola_revision (
  pack_id text NOT NULL REFERENCES granola_pack(id),
  version integer NOT NULL CHECK (version > 0),
  recipe jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  PRIMARY KEY (pack_id, version)
);

-- ---------- 006-granola-types.sql ----------
-- Keep existing recipes and history; allow additional types with stable IDs.
ALTER TABLE granola_pack DROP CONSTRAINT granola_pack_id_check;
ALTER TABLE granola_pack ADD CONSTRAINT granola_pack_id_check CHECK (
  id IN ('basic', 'sports', 'champ') OR
  id ~ '^mix-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);
ALTER TABLE granola_pack ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

-- ---------- 007-granola-ai.sql ----------
-- Shared limits work across serverless instances. No prompts or API keys stored.
CREATE TABLE granola_ai_limit (
  key text PRIMARY KEY,
  count integer NOT NULL CHECK (count > 0),
  reset_at timestamptz NOT NULL
);

-- ---------- 008-branding-access.sql ----------
CREATE TABLE branding_access (
  email text PRIMARY KEY CHECK (email = lower(email)),
  name text NOT NULL,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','revoked')),
  can_edit boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by text,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE TABLE branding_access_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL REFERENCES branding_access(email),
  status text NOT NULL,
  can_edit boolean NOT NULL,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- 009-plan-board.sql ----------
-- Project Molt plan: milestones and tasks with owners, so the brief, the
-- timeline and the board read one record. Content is seeded from
-- src/data/plan-tasks.ts the first time the plan is read from an empty table.
CREATE TABLE plan_person (
  id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9-]{1,40}$'),
  name text NOT NULL,
  email text UNIQUE CHECK (email = lower(email)),
  sort integer NOT NULL DEFAULT 0
);
CREATE TABLE plan_milestone (
  id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9-]{1,40}$'),
  track text NOT NULL CHECK (track IN ('phase1','estelle','dates')),
  code text NOT NULL,
  title text NOT NULL,
  date_label text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL CHECK (ends_on >= starts_on),
  deliverable text NOT NULL DEFAULT '',
  owner_id text REFERENCES plan_person(id),
  links jsonb NOT NULL DEFAULT '[]',
  sort integer NOT NULL
);
CREATE TABLE plan_task (
  id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9-]{1,40}$'),
  milestone_id text NOT NULL REFERENCES plan_milestone(id),
  text text NOT NULL CHECK (length(text) BETWEEN 3 AND 400),
  owner_id text REFERENCES plan_person(id),
  due_on date,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','done')),
  sort integer NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'seed',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'seed'
);
CREATE INDEX plan_task_milestone_idx ON plan_task (milestone_id, sort);
CREATE INDEX plan_task_owner_idx ON plan_task (owner_id, status);
CREATE TABLE plan_task_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id text NOT NULL REFERENCES plan_task(id),
  status text NOT NULL,
  owner_id text,
  actor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Estelle and Dori are pre-approved editors: they can sign in with the
-- email-OTP code straight away and see the workspace once they do.
INSERT INTO branding_access (email, name, reason, status, can_edit, verified_at, decided_at, decided_by)
VALUES
  ('niki.este.2022@ksz.edu-zg.ch', 'Estelle Lily Nikischer', 'Onsite in Tamarin 29 Sep – 19 Oct: granola, business case, customers, shops, the Cup.', 'approved', true, now(), now(), 'andras@hejj.xyz'),
  ('onody.dora@gmail.com', 'Dori Onody', 'Sunset Duckies co-organiser.', 'approved', true, now(), now(), 'andras@hejj.xyz')
ON CONFLICT (email) DO UPDATE SET status = 'approved', can_edit = true,
  verified_at = COALESCE(branding_access.verified_at, now()), decided_at = now(), decided_by = EXCLUDED.decided_by, version = branding_access.version + 1;
INSERT INTO branding_access_event (email, status, can_edit, actor)
VALUES ('niki.este.2022@ksz.edu-zg.ch', 'approved', true, 'andras@hejj.xyz'), ('onody.dora@gmail.com', 'approved', true, 'andras@hejj.xyz');

-- ---------- 010-plan-milestones.sql ----------
-- Project Molt plan, second cut: seven milestones (recipe, design, packaging,
-- produce, buzz, event, partners), each with one due date, instead of dated
-- phases, an onsite track and a list of hard dates. The old rows and their
-- status events are cleared; the next approved read seeds the new plan from
-- src/data/plan-tasks.ts.
DELETE FROM plan_task_event;
DELETE FROM plan_task;
DELETE FROM plan_milestone;
ALTER TABLE plan_milestone DROP COLUMN track, DROP COLUMN starts_on;
ALTER TABLE plan_milestone RENAME COLUMN ends_on TO due_on;

-- ---------- 011-plan-review.sql ----------
-- Project Molt plan: a review step between doing and done (Estelle does the
-- work and moves it to review; Dori signs it off), and the tasks re-owned to
-- match: Estelle does the work, Dori decides, Andras carries none. Generated
-- from src/data/plan-tasks.ts. Live rows are updated in place so statuses
-- moved on the board are kept; tasks the seed added are inserted. On a
-- database that has not been seeded yet both are no-ops and the seed applies.
ALTER TABLE plan_task DROP CONSTRAINT plan_task_status_check;
ALTER TABLE plan_task ADD CONSTRAINT plan_task_status_check CHECK (status IN ('todo','doing','review','done'));

UPDATE plan_milestone AS m SET owner_id = v.owner_id
FROM (VALUES
  ('design', 'dori'),
  ('recipe', 'estelle'),
  ('packaging', 'estelle'),
  ('partners', 'estelle'),
  ('produce', 'estelle'),
  ('buzz', 'estelle'),
  ('event', 'estelle')
) AS v(id, owner_id)
WHERE m.id = v.id AND m.owner_id IS DISTINCT FROM v.owner_id;

CREATE TEMP TABLE plan_seed(id text, milestone_id text, text text, owner_id text, due_on date, sort integer);
INSERT INTO plan_seed VALUES
  ('design-1', 'design', 'Draft design: three directions for the name, the logo lockup and the colours on the bag.', 'estelle', '2026-09-25'::date, 0),
  ('design-2', 'design', 'Draft the label text with everything the law and the shops need: ingredients, allergens, net weight, dates, made in Tamarin. No health claim the recipe cannot back up.', 'estelle', '2026-09-29'::date, 1),
  ('design-3', 'design', 'Show the label to three people outside the club with the product clarity check. Fix the wording.', 'estelle', '2026-10-01'::date, 2),
  ('design-4', 'design', 'Send the print-ready label to the printer with the pouch order.', 'estelle', '2026-10-02'::date, 3),
  ('design-5', 'design', 'Final design: pick a direction from Estelle''s drafts and finish the print-ready label.', 'dori', '2026-10-01'::date, 4),
  ('recipe-1', 'recipe', 'Lock the ingredient list, bag weight and product name from the starter mix in the granola sheet. The list goes on the label and cannot change after this.', 'estelle', '2026-09-28'::date, 0),
  ('recipe-2', 'recipe', 'First bake. Weigh the cooled yield, time every step, enter the actuals and the receipts in the granola sheet.', 'estelle', '2026-09-30'::date, 1),
  ('recipe-3', 'recipe', 'Founding families taste it at Friday training. Write down what they would change.', 'estelle', '2026-10-02'::date, 2),
  ('recipe-4', 'recipe', 'Second bake with tuned quantities. Save the final recipe as a version in the sheet.', 'estelle', '2026-10-07'::date, 3),
  ('recipe-5', 'recipe', 'Business case v1: every allowance replaced by a receipt or a quote, a proposed price and a first-batch quantity.', 'estelle', '2026-10-09'::date, 4),
  ('packaging-1', 'packaging', 'Reach out to two or three suppliers for quotes on stock stand-up pouches and printed labels: price, minimum order, lead time.', 'estelle', '2026-09-23'::date, 0),
  ('packaging-2', 'packaging', 'Choose the packaging provider from Estelle''s quotes. Custom-printed pouches are out for this batch: four to eight weeks plus shipping.', 'dori', '2026-09-25'::date, 1),
  ('packaging-3', 'packaging', 'Place the pouch and label order.', 'estelle', '2026-10-02'::date, 2),
  ('packaging-4', 'packaging', 'Check every pouch and label on delivery. If the printer slips, fall back to plain pouches with home-printed labels. The Cup does not move.', 'estelle', '2026-10-09'::date, 3),
  ('partners-1', 'partners', 'List six to eight shops in Tamarin, La Preneuse and Black River, and write a short intro message to send them.', 'estelle', '2026-09-28'::date, 0),
  ('partners-2', 'partners', 'Introduce Estelle to the shops you know.', 'abiguelle', '2026-10-06'::date, 1),
  ('partners-3', 'partners', 'Six shop visits with the shop sheet: would they stock it, at what margin, what the label needs, minimum order, delivery. Do not sell yet.', 'estelle', '2026-10-06'::date, 2),
  ('partners-4', 'partners', 'Follow up. Confirm which one or two take a trial after the Cup, and on what terms.', 'estelle', '2026-10-13'::date, 3),
  ('partners-5', 'partners', 'Agree the trial terms and the first delivery date with each shop.', 'dori', '2026-10-20'::date, 4),
  ('produce-1', 'produce', 'Confirm the kitchen for Wed 30 Sep, Wed 7 Oct and Thu 15 – Fri 16 Oct. Scales, trays and airtight containers are in it.', 'estelle', '2026-09-28'::date, 0),
  ('produce-2', 'produce', 'Check which food-handling or hygiene rule applies to selling a home-baked product at a club event.', 'estelle', '2026-09-25'::date, 1),
  ('produce-3', 'produce', 'Agree the price and the first-batch quantity from business case v1: how many bags to sell, how many to give away as tastings.', 'dori', '2026-10-09'::date, 2),
  ('produce-4', 'produce', 'Go / no-go: pouches, labels, ingredients, kitchen and helpers all confirmed.', 'dori', '2026-10-12'::date, 3),
  ('produce-5', 'produce', 'Buy all first-batch ingredients. Every receipt photographed into the sheet.', 'estelle', '2026-10-12'::date, 4),
  ('produce-6', 'produce', 'Bake and pack the first batch. Number the bags. Record ingredients, time and cost per bag.', 'estelle', '2026-10-16'::date, 5),
  ('produce-7', 'produce', 'Second pair of hands on the bake and the packing.', 'abiguelle', '2026-10-16'::date, 6),
  ('buzz-1', 'buzz', 'Save-the-date to the parents WhatsApp group: Cup Vol. 02 on 17/18 October, and “we are also cooking something for the day”.', 'dori', '2026-09-18'::date, 0),
  ('buzz-2', 'buzz', 'Instagram account live. Agree who posts.', 'estelle', '2026-09-18'::date, 1),
  ('buzz-3', 'buzz', 'Photo permission forms back from every family whose kid may appear on Instagram or the Cup pages.', 'estelle', '2026-10-02'::date, 2),
  ('buzz-4', 'buzz', 'Teaser 1: something is in the oven. Test-bake shots, no name, no pack.', 'estelle', '2026-10-02'::date, 3),
  ('buzz-5', 'buzz', 'Teaser 2: the maker story. Who bakes it, what goes in, why.', 'estelle', '2026-10-09'::date, 4),
  ('buzz-6', 'buzz', 'Fifteen conversations with people outside the club: the beach, cafés, school pickup. Record price objections, not compliments. Ten names on the pre-order list.', 'estelle', '2026-10-11'::date, 5),
  ('buzz-7', 'buzz', 'Countdown week: schedule post, packaging sneak peek, “first batch reveal at the Cup”.', 'estelle', '2026-10-16'::date, 6),
  ('event-1', 'event', 'Pick the Cup day: Saturday 17 or Sunday 18 October.', 'dori', '2026-09-18'::date, 0),
  ('event-2', 'event', 'Open registration. Confirm the coach for water marshals and the earlier start.', 'dori', '2026-09-25'::date, 1),
  ('event-3', 'event', 'Turn the Vol. 01 checklist into the Vol. 02 one, with the nine lessons added, an owner and a date on every row.', 'estelle', '2026-10-01'::date, 2),
  ('event-4', 'event', 'Volunteers on the sand at Friday training: setup, BBQ, judges, media, side activities. Three judges and the paid food stall confirmed.', 'estelle', '2026-10-07'::date, 3),
  ('event-5', 'event', 'Kit check: gazebos, rashies by colour, tables, sound, first aid. Borrow or buy what is missing.', 'estelle', '2026-10-07'::date, 4),
  ('event-6', 'event', 'Close registration. Tally names, divisions and rashie sizes. Draft the heat draw.', 'estelle', '2026-10-09'::date, 5),
  ('event-7', 'event', 'Sign off the heat draw and the safety plan.', 'dori', '2026-10-12'::date, 6),
  ('event-8', 'event', 'Print scorecards, run of show, heat tags and certificates. Pack rashies, markers and prize bags.', 'estelle', '2026-10-14'::date, 7),
  ('event-9', 'event', 'Stall ready: packing station, numbered labels, price sign, cash float, pre-order form.', 'estelle', '2026-10-14'::date, 8),
  ('event-10', 'event', 'Brief the judges and the setup crew at Friday training. Send the reminder: time, what to bring, parents stay.', 'estelle', '2026-10-16'::date, 9),
  ('event-11', 'event', 'Run the desk and the run of show on the day.', 'estelle', '2026-10-17'::date, 10),
  ('event-12', 'event', 'Run the granola stall and the tally: bags sold, pre-orders, refusals and the reasons.', 'abiguelle', '2026-10-17'::date, 11),
  ('event-13', 'event', 'MC the day. Reveal the granola before the crowns.', 'dori', '2026-10-17'::date, 12),
  ('event-14', 'event', 'Results and thank-you on WhatsApp and Instagram, with the pre-order form for batch two.', 'estelle', '2026-10-18'::date, 13),
  ('event-15', 'event', 'The 48-hour report: bags sold, pre-orders, refusals, what people said.', 'estelle', '2026-10-20'::date, 14);

UPDATE plan_task AS t SET text = s.text, owner_id = s.owner_id, due_on = s.due_on, updated_at = now(), updated_by = 'seed'
FROM plan_seed AS s
WHERE t.id = s.id AND (t.text <> s.text OR t.owner_id IS DISTINCT FROM s.owner_id OR t.due_on IS DISTINCT FROM s.due_on);

INSERT INTO plan_task (id, milestone_id, text, owner_id, due_on, sort)
SELECT s.id, s.milestone_id, s.text, s.owner_id, s.due_on, s.sort
FROM plan_seed AS s
WHERE EXISTS (SELECT 1 FROM plan_milestone m WHERE m.id = s.milestone_id)
  AND NOT EXISTS (SELECT 1 FROM plan_task t WHERE t.id = s.id);

DROP TABLE plan_seed;
