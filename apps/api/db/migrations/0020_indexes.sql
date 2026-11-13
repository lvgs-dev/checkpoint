-- The migration runner supplies one transaction for this file.
SET LOCAL lock_timeout = '5s';

SET LOCAL statement_timeout = '60s';

SET LOCAL search_path = public, extensions;

CREATE INDEX IF NOT EXISTS library_entry_user_id_idx ON public.library_entry (user_id, id);

CREATE INDEX IF NOT EXISTS game_list_user_created_idx ON public.game_list (user_id, created_at, id);

CREATE INDEX IF NOT EXISTS game_name_normalized_trgm_idx ON public.game USING gin (public.norm_key(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS game_pace_idx ON public.game (pace);

CREATE INDEX IF NOT EXISTS game_structure_idx ON public.game (structure);

CREATE INDEX IF NOT EXISTS library_entry_platform_idx ON public.library_entry (platform);

CREATE INDEX IF NOT EXISTS app_release_env_sha_id_idx ON public.app_release (environment, git_sha, id DESC);
