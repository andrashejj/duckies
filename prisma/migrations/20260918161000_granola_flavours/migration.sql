-- The three printed flavours — The OG, Dawn Patrol, Power Up — replace the
-- working titles Basic, Sports and Champ as the stored starter recipes. A
-- saved recipe under an old id moves to the new one with its version history;
-- a name the editors already changed is kept.
ALTER TABLE granola_pack DROP CONSTRAINT granola_pack_id_check;
ALTER TABLE granola_pack ADD CONSTRAINT granola_pack_id_check CHECK (
  id IN ('the-og', 'dawn-patrol', 'power-up') OR
  id ~ '^mix-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
) NOT VALID;

INSERT INTO granola_pack (id, recipe, version, updated_at, updated_by, created_at)
SELECT
  CASE id WHEN 'basic' THEN 'the-og' WHEN 'sports' THEN 'dawn-patrol' ELSE 'power-up' END,
  CASE WHEN recipe->>'name' IN ('Basic', 'Sports', 'Champ')
    THEN jsonb_set(recipe, '{name}', to_jsonb(CASE id WHEN 'basic' THEN 'The OG' WHEN 'sports' THEN 'Dawn Patrol' ELSE 'Power Up' END))
    ELSE recipe END,
  version, updated_at, updated_by, created_at
FROM granola_pack WHERE id IN ('basic', 'sports', 'champ')
ON CONFLICT (id) DO NOTHING;

UPDATE granola_revision SET pack_id = CASE pack_id WHEN 'basic' THEN 'the-og' WHEN 'sports' THEN 'dawn-patrol' ELSE 'power-up' END
WHERE pack_id IN ('basic', 'sports', 'champ');

DELETE FROM granola_pack WHERE id IN ('basic', 'sports', 'champ');

ALTER TABLE granola_pack VALIDATE CONSTRAINT granola_pack_id_check;
