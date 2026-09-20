BEGIN;
-- New heats require explicit judge selection, including organisers.
ALTER TABLE cup_heat ADD COLUMN judges TEXT[] NOT NULL DEFAULT '{}';
-- Do not silently reinterpret existing ten-point scores as stars.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM cup_wave) THEN
    RAISE EXCEPTION 'Existing Cup scores need review before switching to five-star judging. Export and resolve them before applying this migration.';
  END IF;
END $$;
ALTER TABLE cup_wave DROP CONSTRAINT cup_wave_score;
ALTER TABLE cup_wave ADD CONSTRAINT cup_wave_score CHECK (score BETWEEN 1 AND 5 AND score = trunc(score));
COMMIT;
