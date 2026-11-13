-- The migration runner supplies one transaction for this file.
CREATE TABLE IF NOT EXISTS user_queue_state (
  user_id        uuid PRIMARY KEY REFERENCES app_user (id) ON DELETE CASCADE,
  inputs_version bigint NOT NULL DEFAULT 1,
  changed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS queue_snapshot (
  user_id           uuid PRIMARY KEY REFERENCES app_user (id) ON DELETE CASCADE,
  inputs_version    bigint      NOT NULL,

  algorithm_version text        NOT NULL DEFAULT '1',

  computed_at       timestamptz NOT NULL DEFAULT now(),
  compute_ms        integer,
  time_factor       numeric(6,4) NOT NULL,
  total             integer      NOT NULL,
  estimated_hours   numeric(10,1) NOT NULL,
  weights           jsonb NOT NULL CHECK (jsonb_typeof(weights) = 'object'),
  excluded          jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(excluded) = 'array')


);

CREATE TABLE IF NOT EXISTS queue_snapshot_item (
  user_id          uuid    NOT NULL REFERENCES queue_snapshot (user_id) ON DELETE CASCADE,
  position         integer NOT NULL CHECK (position > 0),
  game_id          bigint  NOT NULL,
  library_entry_id bigint  NOT NULL REFERENCES library_entry (id) ON DELETE CASCADE,
  algorithm_score  numeric(8,2) NOT NULL,

  manual_points    numeric(8,2) NOT NULL DEFAULT 0,

  score            numeric(8,2) NOT NULL,

  cumulative_hours numeric(10,1) NOT NULL,
  planned_hours    numeric(9,2),
  base_score       numeric(6,1),
  affinity         numeric(5,1),
  reasons          text[] NOT NULL DEFAULT '{}',
  adjustments      jsonb  NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(adjustments) = 'array'),


  PRIMARY KEY (user_id, position),
  CONSTRAINT queue_snapshot_item_game_uq UNIQUE (user_id, game_id)
);

CREATE INDEX IF NOT EXISTS queue_snapshot_item_entry_idx ON queue_snapshot_item (library_entry_id);

CREATE OR REPLACE FUNCTION bump_queue_version(p_user_ids uuid[]) RETURNS void LANGUAGE sql
  SECURITY DEFINER SET search_path = public, extensions AS $$
  INSERT INTO user_queue_state AS s (user_id, inputs_version, changed_at)
  SELECT DISTINCT u, 2, now() FROM unnest(p_user_ids) AS u
   WHERE u IS NOT NULL
  ON CONFLICT (user_id) DO UPDATE
     SET inputs_version = s.inputs_version + 1, changed_at = now();
$$;

CREATE OR REPLACE FUNCTION trg_library_entry_bump_ins() RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM bump_queue_version(array(SELECT DISTINCT user_id FROM new_rows));
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION trg_library_entry_bump_del() RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM bump_queue_version(array(SELECT DISTINCT user_id FROM old_rows));
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION trg_library_entry_bump_upd() RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM bump_queue_version(array(
    SELECT DISTINCT n.user_id
      FROM new_rows n JOIN old_rows o ON o.id = n.id
     WHERE (n.status, n.desire, n.actual_hours, n.finished_at, n.rating,
            n.primary_genre_id, n.tag_ids, n.is_endless, n.game_id, n.user_id)
           IS DISTINCT FROM
           (o.status, o.desire, o.actual_hours, o.finished_at, o.rating,
            o.primary_genre_id, o.tag_ids, o.is_endless, o.game_id, o.user_id)));
  RETURN NULL;
END $$;

CREATE OR REPLACE TRIGGER trg_library_entry_bump_ins AFTER INSERT ON library_entry
  REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION trg_library_entry_bump_ins();

CREATE OR REPLACE TRIGGER trg_library_entry_bump_del AFTER DELETE ON library_entry
  REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION trg_library_entry_bump_del();

CREATE OR REPLACE TRIGGER trg_library_entry_bump_upd AFTER UPDATE ON library_entry
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION trg_library_entry_bump_upd();

CREATE OR REPLACE FUNCTION trg_game_bump() RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  PERFORM bump_queue_version(array(SELECT DISTINCT user_id FROM library_entry WHERE game_id = NEW.id));
  RETURN NULL;
END $$;

CREATE OR REPLACE TRIGGER trg_game_bump AFTER UPDATE ON game
  FOR EACH ROW
  WHEN ((OLD.pace, OLD.structure, OLD.mechanic_id, OLD.main_hours, OLD.extra_hours,
         OLD.previous_estimated_hours, OLD.prerequisite_game_id)
        IS DISTINCT FROM
        (NEW.pace, NEW.structure, NEW.mechanic_id, NEW.main_hours, NEW.extra_hours,
         NEW.previous_estimated_hours, NEW.prerequisite_game_id))
  EXECUTE FUNCTION trg_game_bump();

CREATE OR REPLACE FUNCTION trg_user_row_bump() RETURNS trigger LANGUAGE plpgsql
  SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM bump_queue_version(ARRAY[OLD.user_id]);
  ELSE
    PERFORM bump_queue_version(ARRAY[NEW.user_id]);
  END IF;
  RETURN NULL;
END $$;

CREATE OR REPLACE TRIGGER trg_weights_bump AFTER INSERT OR UPDATE OR DELETE ON user_score_weights
  FOR EACH ROW EXECUTE FUNCTION trg_user_row_bump();

CREATE OR REPLACE TRIGGER trg_qma_bump AFTER INSERT OR UPDATE OR DELETE ON queue_manual_adjustment
  FOR EACH ROW EXECUTE FUNCTION trg_user_row_bump();

CREATE OR REPLACE VIEW queue_freshness AS
SELECT u.id AS user_id,
       coalesce(st.inputs_version, 1) AS current_version,
       qs.inputs_version              AS snapshot_version,
       qs.computed_at,
       (qs.inputs_version IS NOT NULL
        AND qs.inputs_version = coalesce(st.inputs_version, 1)) AS is_fresh
  FROM app_user u
  LEFT JOIN user_queue_state st ON st.user_id = u.id
  LEFT JOIN queue_snapshot  qs ON qs.user_id = u.id;
