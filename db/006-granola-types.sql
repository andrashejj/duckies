-- Keep existing recipes and history; allow additional types with stable IDs.
ALTER TABLE granola_pack DROP CONSTRAINT granola_pack_id_check;
ALTER TABLE granola_pack ADD CONSTRAINT granola_pack_id_check CHECK (
  id IN ('basic', 'sports', 'champ') OR
  id ~ '^mix-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);
ALTER TABLE granola_pack ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
