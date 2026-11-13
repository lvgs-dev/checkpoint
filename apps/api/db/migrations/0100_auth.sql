CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE auth_identity (
  id uuid PRIMARY KEY,
  email citext UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  password_hash text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz
);
CREATE TABLE auth_provider_link (
  identity_id uuid NOT NULL REFERENCES auth_identity(id) ON DELETE CASCADE,
  provider text NOT NULL,
  subject text NOT NULL,
  UNIQUE (provider, subject)
);
CREATE INDEX auth_provider_link_identity_idx ON auth_provider_link(identity_id);
CREATE TABLE auth_session (
  id uuid PRIMARY KEY,
  identity_id uuid NOT NULL REFERENCES auth_identity(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  revoked_at timestamptz
);
CREATE INDEX auth_session_identity_idx ON auth_session(identity_id);
CREATE INDEX auth_session_expiry_idx ON auth_session(expires_at);
CREATE TABLE auth_token (
  id uuid PRIMARY KEY,
  identity_id uuid NOT NULL REFERENCES auth_identity(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('verify_email', 'reset_password')),
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
CREATE INDEX auth_token_identity_idx ON auth_token(identity_id);
CREATE TABLE auth_oauth_state (
  token_hash bytea PRIMARY KEY,
  verifier text NOT NULL,
  redirect_path text NOT NULL,
  expires_at timestamptz NOT NULL
);
