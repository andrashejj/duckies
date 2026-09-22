-- A member kid's legal guardians are club members (see grantGuardianMembership).
-- Back-fill today's families. Membership an organiser deliberately ended stays
-- ended: those guardians keep family access and can be re-approved by hand.
INSERT INTO club_member (email, role)
SELECT DISTINCT g.email, 'member' FROM club_current_guardian g
WHERE EXISTS (SELECT 1 FROM club_signed_waiver WHERE kid_id=g.kid_id)
  AND COALESCE((SELECT status='paid' FROM club_payment_event WHERE kid_id=g.kid_id
    AND term=(SELECT id FROM club_semester WHERE is_current) ORDER BY recorded_at DESC, id DESC LIMIT 1), false)
  AND NOT EXISTS (SELECT 1 FROM club_member_archive a WHERE a.email=g.email AND a.departure_known)
ON CONFLICT (email) DO NOTHING;
