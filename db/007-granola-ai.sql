-- Shared limits work across serverless instances. No prompts or API keys stored.
CREATE TABLE granola_ai_limit (
  key text PRIMARY KEY,
  count integer NOT NULL CHECK (count > 0),
  reset_at timestamptz NOT NULL
);
