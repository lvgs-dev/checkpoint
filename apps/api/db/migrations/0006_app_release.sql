-- The migration runner supplies one transaction for this file.
CREATE TABLE IF NOT EXISTS app_release (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version              text        NOT NULL,

  git_sha              text        NOT NULL,
  git_ref              text,

  commit_message       text,
  vercel_deployment_id text,

  vercel_url           text,

  environment          text        NOT NULL DEFAULT 'development'
                       CHECK (environment IN ('production', 'preview', 'development')),
  db_migration_version text,

  status               text        NOT NULL DEFAULT 'deployed'
                       CHECK (status IN ('deployed', 'rolled_back', 'superseded')),
  rolled_back_to       bigint      REFERENCES app_release (id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  notes                text
);

CREATE UNIQUE INDEX IF NOT EXISTS app_release_deployment_uidx ON app_release (vercel_deployment_id);

CREATE INDEX IF NOT EXISTS app_release_env_created_idx ON app_release (environment, created_at DESC);

CREATE INDEX IF NOT EXISTS app_release_git_sha_idx ON app_release (git_sha);

CREATE INDEX IF NOT EXISTS app_release_rolled_back_to_idx ON app_release (rolled_back_to)
  WHERE rolled_back_to IS NOT NULL;

COMMENT ON TABLE app_release IS
  'Versões publicadas (deploys). Gravada no build da Vercel; usada por scripts/rollback.mjs.';
