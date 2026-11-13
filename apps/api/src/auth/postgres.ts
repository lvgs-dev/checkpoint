import type { Sql } from "../data/db.ts";
import type {
  AuthRepository,
  Identity,
  OAuthState,
  SessionRecord,
  TokenKind,
  TokenRecord,
} from "./repository.ts";

interface IdentityRow {
  id: string;
  email: string | null;
  email_verified: boolean;
  password_hash: string | null;
  role: Identity["role"];
  disabled_at: Date | null;
}
const identity = (row: IdentityRow): Identity => ({
  id: row.id,
  email: row.email,
  emailVerified: row.email_verified,
  passwordHash: row.password_hash,
  role: row.role,
  disabledAt: row.disabled_at,
});

export class PgAuthRepository implements AuthRepository {
  private sql: Sql;
  constructor(sql: Sql) {
    this.sql = sql;
  }
  async createIdentity(user: Identity) {
    const rows = await this.sql`
      INSERT INTO auth_identity (id, email, email_verified, password_hash, role)
      VALUES (${user.id}, ${user.email}, ${user.emailVerified}, ${user.passwordHash}, 'user')
      ON CONFLICT (email) DO NOTHING RETURNING id`;
    return rows.length > 0;
  }
  async findEmail(email: string) {
    const [row] = await this.sql<IdentityRow[]>`SELECT * FROM auth_identity WHERE email = ${email}`;
    return row && identity(row);
  }
  async findIdentity(id: string) {
    const [row] = await this.sql<IdentityRow[]>`SELECT * FROM auth_identity WHERE id = ${id}`;
    return row && identity(row);
  }
  async createSession(session: SessionRecord, expectedHash: string | null, previousHash?: Buffer) {
    return this.sql.begin(async (tx) => {
      const [row] = await tx<
        IdentityRow[]
      >`SELECT * FROM auth_identity WHERE id = ${session.identityId} FOR UPDATE`;
      if (!row || row.disabled_at || row.password_hash !== expectedHash) return false;
      if (previousHash)
        await tx`UPDATE auth_session SET revoked_at = now() WHERE token_hash = ${previousHash}`;
      await tx`INSERT INTO auth_session (id, identity_id, token_hash, expires_at, user_agent)
        VALUES (${session.id}, ${session.identityId}, ${session.tokenHash}, ${session.expiresAt}, ${session.userAgent})`;
      return true;
    });
  }
  async findSession(hash: Buffer, now: Date) {
    const [row] = await this.sql<IdentityRow[]>`
      WITH active AS (
        UPDATE auth_session SET last_seen_at = ${now}
        WHERE token_hash = ${hash} AND revoked_at IS NULL AND expires_at > ${now}
        RETURNING identity_id
      ) SELECT i.* FROM auth_identity i JOIN active s ON s.identity_id = i.id`;
    return row && identity(row);
  }
  async revokeSession(hash: Buffer, now: Date, all: boolean) {
    await this.sql`UPDATE auth_session SET revoked_at = ${now}
      WHERE revoked_at IS NULL AND (token_hash = ${hash} OR (${all} AND identity_id IN (
        SELECT identity_id FROM auth_session WHERE token_hash = ${hash}
          AND revoked_at IS NULL AND expires_at > ${now})))`;
  }
  async saveToken(token: TokenRecord) {
    await this.sql`INSERT INTO auth_token (id, identity_id, kind, token_hash, expires_at)
      VALUES (${token.id}, ${token.identityId}, ${token.kind}, ${token.tokenHash}, ${token.expiresAt})`;
  }
  async consumeToken(hash: Buffer, kind: TokenKind, now: Date, passwordHash?: string) {
    return this.sql.begin(async (tx) => {
      // Lock identity before token so concurrent login and recovery use one lock order.
      const [user] = await tx<
        IdentityRow[]
      >`SELECT i.* FROM auth_identity i JOIN auth_token t ON t.identity_id = i.id
        WHERE t.token_hash = ${hash} AND t.kind = ${kind} FOR UPDATE OF i`;
      if (!user || user.disabled_at) return false;
      const used = await tx`UPDATE auth_token SET used_at = ${now}
        WHERE token_hash = ${hash} AND kind = ${kind} AND used_at IS NULL AND expires_at > ${now}
        RETURNING id`;
      if (!used.length) return false;
      if (kind === "verify_email") {
        await tx`UPDATE auth_identity SET email_verified = true WHERE id = ${user.id}`;
      } else {
        if (!passwordHash) throw new Error("Password hash required");
        await tx`UPDATE auth_identity SET password_hash = ${passwordHash}, email_verified = true WHERE id = ${user.id}`;
        await tx`UPDATE auth_session SET revoked_at = ${now} WHERE identity_id = ${user.id} AND revoked_at IS NULL`;
        await tx`UPDATE auth_token SET used_at = ${now} WHERE identity_id = ${user.id} AND used_at IS NULL`;
      }
      return true;
    });
  }
  async findProvider(provider: string, subject: string) {
    const [row] = await this.sql<IdentityRow[]>`SELECT i.* FROM auth_identity i
      JOIN auth_provider_link p ON p.identity_id = i.id
      WHERE p.provider = ${provider} AND p.subject = ${subject}`;
    return row && identity(row);
  }
  async createProviderIdentity(user: Identity, provider: string, subject: string) {
    // Serialize creation for the same provider subject across API instances.
    return this.sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${provider + ":" + subject}, 0))`;
      const [existing] = await tx<
        IdentityRow[]
      >`SELECT i.* FROM auth_identity i JOIN auth_provider_link p ON p.identity_id = i.id
        WHERE p.provider = ${provider} AND p.subject = ${subject}`;
      if (existing) return identity(existing);
      await tx`INSERT INTO auth_identity (id, role) VALUES (${user.id}, 'user')`;
      await tx`INSERT INTO auth_provider_link (identity_id, provider, subject) VALUES (${user.id}, ${provider}, ${subject})`;
      return user;
    });
  }
  async saveOAuthState(hash: Buffer, state: OAuthState) {
    await this.sql`DELETE FROM auth_oauth_state WHERE expires_at < now()`;
    await this.sql`INSERT INTO auth_oauth_state (token_hash, verifier, redirect_path, expires_at)
      VALUES (${hash}, ${state.verifier}, ${state.redirectPath}, ${state.expiresAt})`;
  }
  async consumeOAuthState(hash: Buffer, now: Date) {
    const [row] = await this.sql<{ verifier: string; redirect_path: string; expires_at: Date }[]>`
      DELETE FROM auth_oauth_state WHERE token_hash = ${hash} AND expires_at > ${now} RETURNING *`;
    return (
      row && { verifier: row.verifier, redirectPath: row.redirect_path, expiresAt: row.expires_at }
    );
  }
}
