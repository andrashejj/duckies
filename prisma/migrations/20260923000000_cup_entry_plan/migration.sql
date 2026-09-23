-- What the family asked for when they put a child on the cup list: the Cup
-- alone, or club membership with it. Until now the choice survived only as the
-- term of the registration link we issued, so a family joining the club read
-- as a Rs 1,000 cup-only entry on the roster until they signed.
-- `member` stays what it always was: entry is free because they are paid up.
ALTER TABLE club_cup_entry
  ADD COLUMN plan text NOT NULL DEFAULT 'cup'
  CONSTRAINT club_cup_entry_plan CHECK (plan IN ('cup', 'club'));

-- Existing rows: a semester registration — signed, or still open — is a family
-- who chose the club. So is anyone already on the list as a member.
UPDATE club_cup_entry c SET plan = 'club'
WHERE c.member
   OR EXISTS (SELECT 1 FROM club_signed_waiver w WHERE w.kid_id = c.kid_id AND w.term NOT LIKE 'cup-%')
   OR EXISTS (SELECT 1 FROM club_registration_link l WHERE l.kid_id = c.kid_id AND l.term NOT LIKE 'cup-%');
