-- The migration runner supplies one transaction for this file.
ALTER TABLE user_score_weights
  ADD COLUMN IF NOT EXISTS filters jsonb NOT NULL DEFAULT '{}'
    CONSTRAINT user_score_weights_filters_object CHECK (jsonb_typeof(filters) = 'object');
