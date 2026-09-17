-- A family can correct a signed registration through the same private link
-- while it is valid; each correction is a new append-only record that names
-- the one it replaces (snapshot.evidence.supersedes). The baseline declared
-- link_id UNIQUE as a column constraint, so it is dropped as a constraint.
ALTER TABLE club_signed_waiver DROP CONSTRAINT club_signed_waiver_link_id_key;
CREATE INDEX club_signed_waiver_link ON club_signed_waiver(link_id, signed_at DESC);
