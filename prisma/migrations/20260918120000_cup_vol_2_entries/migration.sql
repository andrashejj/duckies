-- Cup Vol. 02 registration. The Cup is a term of its own so cup-only families
-- sign the same registration form and waiver through it, and the Rs 1,000 entry
-- fee is tracked like a semester payment. Members register with their signed
-- club registration and skip the form.
INSERT INTO club_semester (id, label, starts_on, ends_on, child_fee_mur, family_fee_mur)
VALUES ('cup-vol-2', 'Sunset Duckies Cup Vol. 02', '2026-10-16', '2026-10-16', 1000, 1000)
ON CONFLICT (id) DO NOTHING;

-- Who is coming, and whether they came in as a member or a cup-only kid.
CREATE TABLE club_cup_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kid_id uuid NOT NULL REFERENCES club_kid(id),
  edition text NOT NULL,
  member boolean NOT NULL,
  contact_name text NOT NULL,
  contact_phone text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX club_cup_entry_kid_edition ON club_cup_entry(kid_id, edition);

-- Cup-only kids and their registration links are created by the family from
-- the public cup page, so there is no organiser to attribute them to.
ALTER TABLE club_kid ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE club_registration_link ALTER COLUMN created_by DROP NOT NULL;
