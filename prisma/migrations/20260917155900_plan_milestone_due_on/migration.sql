-- Staging was baselined onto an older plan_milestone (track / starts_on /
-- ends_on) that the seed had never filled, so the Cup date migration that
-- follows failed there on the missing due_on column. Bring the table to the
-- schema's shape. Production already has it, so every statement is a no-op
-- there; the default only exists to satisfy NOT NULL and is dropped again.
ALTER TABLE plan_milestone
  DROP COLUMN IF EXISTS track,
  DROP COLUMN IF EXISTS starts_on,
  DROP COLUMN IF EXISTS ends_on;
ALTER TABLE plan_milestone ADD COLUMN IF NOT EXISTS due_on DATE NOT NULL DEFAULT DATE '2026-10-01';
ALTER TABLE plan_milestone ALTER COLUMN due_on DROP DEFAULT;
