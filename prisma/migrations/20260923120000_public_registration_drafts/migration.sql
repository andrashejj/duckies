-- One public registration form. A family opening /register gets a draft link
-- that belongs to no kid and no term yet: photos stage against it while they
-- fill the form in, and nothing reaches the roster until they sign. Signing
-- names the kids and the term (the Cup, or the semester), and from then on the
-- link is an ordinary one — corrections and the download work as before.
ALTER TABLE club_registration_link ALTER COLUMN kid_id DROP NOT NULL;
ALTER TABLE club_registration_link ALTER COLUMN term DROP NOT NULL;
ALTER TABLE club_registration_link ADD CONSTRAINT club_registration_link_draft
  CHECK ((kid_id IS NULL) = (term IS NULL) AND (kid_id IS NOT NULL OR completed_at IS NULL));
