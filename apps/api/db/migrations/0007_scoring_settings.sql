-- The migration runner supplies one transaction for this file.
ALTER TABLE user_score_weights
  ADD COLUMN IF NOT EXISTS rules jsonb NOT NULL DEFAULT '{}'
    CONSTRAINT user_score_weights_rules_object CHECK (jsonb_typeof(rules) = 'object'),
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1
    CONSTRAINT user_score_weights_version_positive CHECK (version > 0);
