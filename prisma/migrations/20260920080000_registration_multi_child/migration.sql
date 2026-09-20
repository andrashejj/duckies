-- One signature, a whole family. A guardian fills in each child, then signs
-- the waiver once; the club still keeps a separate signed record per child,
-- with its own PDF and seal, so nothing about a kid's file changes.
--
-- Two things that were one-per-link become one-per-child:
--   * the staged profile photo, keyed by the form slot the family filled it in
--   * the signed records, tied together by the signing that produced them

BEGIN;

ALTER TABLE club_registration_photo ADD COLUMN slot integer NOT NULL DEFAULT 0;
ALTER TABLE club_registration_photo DROP CONSTRAINT club_registration_photo_pkey;
ALTER TABLE club_registration_photo ADD PRIMARY KEY (link_id, slot);

-- Records signed together share a group, and keep the order the guardian
-- listed the children in — they share a signing timestamp to the millisecond,
-- so nothing else orders them. Every record signed before today was its own
-- signing, so it becomes a group of one, first in it.
ALTER TABLE club_signed_waiver ADD COLUMN signing_group uuid;
ALTER TABLE club_signed_waiver ADD COLUMN child_index smallint NOT NULL DEFAULT 0;
-- ALTER TABLE holds an exclusive lock through COMMIT. Permit only this
-- metadata backfill, then restore the append-only guard before releasing it.
-- The signed payload, PDF, hashes and seal are never rewritten.
ALTER TABLE club_signed_waiver DISABLE TRIGGER immutable_waiver;
UPDATE club_signed_waiver SET signing_group = id WHERE signing_group IS NULL;
ALTER TABLE club_signed_waiver ENABLE TRIGGER immutable_waiver;
ALTER TABLE club_signed_waiver ALTER COLUMN signing_group SET NOT NULL;
CREATE INDEX club_signed_waiver_group ON club_signed_waiver (signing_group, child_index);

COMMIT;
