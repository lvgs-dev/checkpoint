-- The migration runner supplies one transaction for this file.
ALTER TABLE app_release
  ADD COLUMN IF NOT EXISTS name        text,
  ADD COLUMN IF NOT EXISTS kind        text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS created_by  text,
  ADD COLUMN IF NOT EXISTS rollback_to bigint REFERENCES app_release (id);

CREATE TABLE IF NOT EXISTS app_release_deploy (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  release_id           bigint      NOT NULL REFERENCES app_release (id),
  git_sha              text        NOT NULL,
  environment          text        NOT NULL
                       CHECK (environment IN ('production', 'preview', 'development')),
  vercel_deployment_id text        UNIQUE,

  vercel_url           text,

  db_migration_version text,

  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_release_deploy_release_idx ON app_release_deploy (release_id, id DESC);

TRUNCATE TABLE app_release_deploy, app_release RESTART IDENTITY;

ALTER TABLE app_release
  ALTER COLUMN kind SET DEFAULT 'chore',
  ALTER COLUMN kind SET NOT NULL,
  ALTER COLUMN description SET NOT NULL,
  ALTER COLUMN environment SET DEFAULT 'production',
  ADD CONSTRAINT app_release_kind_chk
    CHECK (kind IN ('feature', 'fix', 'refactor', 'chore', 'release', 'rollback')),
  ADD CONSTRAINT app_release_version_chk
    CHECK (version ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'),
  ADD CONSTRAINT app_release_description_chk CHECK (length(btrim(description)) BETWEEN 3 AND 500),
  ADD CONSTRAINT app_release_name_chk CHECK (name IS NULL OR length(btrim(name)) BETWEEN 1 AND 80),
  ADD CONSTRAINT app_release_ref_chk CHECK (git_ref IS NULL OR length(btrim(git_ref)) BETWEEN 1 AND 200),
  ADD CONSTRAINT app_release_sha_chk CHECK (git_sha ~ '^[0-9a-f]{40}$'),
  ADD CONSTRAINT app_release_rollback_chk CHECK ((kind = 'rollback') = (rollback_to IS NOT NULL));

ALTER TABLE app_release ADD CONSTRAINT app_release_id_env_key UNIQUE (id, environment),
  ADD CONSTRAINT app_release_identity_key UNIQUE (id, git_sha, environment),
  ADD CONSTRAINT app_release_rollback_environment_fk
    FOREIGN KEY (rollback_to, environment) REFERENCES app_release (id, environment);

ALTER TABLE app_release_deploy
  ADD CONSTRAINT app_release_deploy_sha_chk CHECK (git_sha ~ '^[0-9a-f]{40}$'),
  ADD CONSTRAINT app_release_deploy_identity_fk
    FOREIGN KEY (release_id, git_sha, environment)
    REFERENCES app_release (id, git_sha, environment);

DROP INDEX IF EXISTS app_release_deployment_uidx;

DROP INDEX IF EXISTS app_release_rolled_back_to_idx;

DROP INDEX IF EXISTS app_release_env_created_idx;

DROP INDEX IF EXISTS app_release_git_sha_idx;

ALTER TABLE app_release
  DROP COLUMN IF EXISTS commit_message,
  DROP COLUMN IF EXISTS vercel_deployment_id,
  DROP COLUMN IF EXISTS vercel_url,
  DROP COLUMN IF EXISTS db_migration_version,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS rolled_back_to,
  DROP COLUMN IF EXISTS notes;

CREATE UNIQUE INDEX IF NOT EXISTS app_release_env_version_uidx ON app_release (environment, version);

CREATE UNIQUE INDEX IF NOT EXISTS app_release_env_sha_uidx ON app_release (environment, git_sha)
  WHERE kind <> 'rollback';

CREATE INDEX IF NOT EXISTS app_release_env_id_idx ON app_release (environment, id DESC);

CREATE INDEX IF NOT EXISTS app_release_rollback_to_idx ON app_release (rollback_to)
  WHERE rollback_to IS NOT NULL;

CREATE OR REPLACE FUNCTION app_release_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not permitted', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

DROP TRIGGER IF EXISTS trg_app_release_append_only ON app_release;

CREATE TRIGGER trg_app_release_append_only BEFORE UPDATE OR DELETE ON app_release
  FOR EACH ROW EXECUTE FUNCTION app_release_append_only();

DROP TRIGGER IF EXISTS trg_app_release_truncate ON app_release;

CREATE TRIGGER trg_app_release_truncate BEFORE TRUNCATE ON app_release
  FOR EACH STATEMENT EXECUTE FUNCTION app_release_append_only();

DROP TRIGGER IF EXISTS trg_app_release_deploy_append_only ON app_release_deploy;

CREATE TRIGGER trg_app_release_deploy_append_only BEFORE UPDATE OR DELETE ON app_release_deploy
  FOR EACH ROW EXECUTE FUNCTION app_release_append_only();

DROP TRIGGER IF EXISTS trg_app_release_deploy_truncate ON app_release_deploy;

CREATE TRIGGER trg_app_release_deploy_truncate BEFORE TRUNCATE ON app_release_deploy
  FOR EACH STATEMENT EXECUTE FUNCTION app_release_append_only();

COMMENT ON TABLE app_release IS
  'Append-only release registrations: SemVer per environment, description, kind, and commit.';

COMMENT ON TABLE app_release_deploy IS
  'Append-only Vercel build evidence linked to a release registration.';
