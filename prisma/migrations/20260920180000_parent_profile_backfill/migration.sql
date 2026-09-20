-- Populate the private parent directory for families registered before profiles
-- existed. Keep the latest contact per email, and never overwrite saved profiles.
WITH latest_waivers AS (
  SELECT DISTINCT ON (w.kid_id) w.id, w.link_id, w.signed_at, w.snapshot
  FROM club_signed_waiver w JOIN club_kid k ON k.id=w.kid_id
  WHERE k.archived_at IS NULL
  ORDER BY w.kid_id, w.signed_at DESC, w.id DESC
), guardians AS (
  SELECT lower(trim(g->>'email')) AS email, trim(g->>'name') AS name,
    COALESCE(trim(g->>'phone'),'') AS phone, w.link_id, w.signed_at, w.id
  FROM latest_waivers w, jsonb_array_elements(COALESCE(w.snapshot->'registration'->'guardians','[]'::jsonb)) g
  WHERE COALESCE(trim(g->>'email'),'')<>'' AND COALESCE(trim(g->>'name'),'')<>''
), latest_contacts AS (
  SELECT DISTINCT ON (email) email,name,phone,link_id FROM guardians
  ORDER BY email,signed_at DESC,id DESC
)
INSERT INTO club_parent_profile(email,name,phone,registration_link_id)
SELECT email,name,phone,link_id FROM latest_contacts
ON CONFLICT(email) DO NOTHING;
