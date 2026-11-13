-- The migration runner supplies one transaction for this file.
CREATE OR REPLACE FUNCTION bump_queue_version(p_user_ids uuid[]) RETURNS void LANGUAGE sql
  SECURITY DEFINER SET search_path = public, extensions AS $$
  INSERT INTO user_queue_state AS s (user_id, inputs_version, changed_at)
  SELECT DISTINCT u, 2, now() FROM unnest(p_user_ids) AS u
   WHERE u IS NOT NULL AND EXISTS (SELECT 1 FROM app_user WHERE id = u)
  ON CONFLICT (user_id) DO UPDATE
     SET inputs_version = s.inputs_version + 1, changed_at = now();
$$;
