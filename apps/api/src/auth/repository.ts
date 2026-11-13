import type { Role } from "../../../../packages/core/src/authorization.ts";

export interface Identity {
  id: string;
  email: string | null;
  emailVerified: boolean;
  passwordHash: string | null;
  role: Role;
  disabledAt: Date | null;
}
export interface SessionRecord {
  id: string;
  identityId: string;
  tokenHash: Buffer;
  expiresAt: Date;
  userAgent: string;
}
export type TokenKind = "verify_email" | "reset_password";
export interface TokenRecord {
  id: string;
  identityId: string;
  kind: TokenKind;
  tokenHash: Buffer;
  expiresAt: Date;
}
export interface OAuthState {
  verifier: string;
  redirectPath: string;
  expiresAt: Date;
}

export interface AuthRepository {
  createIdentity(identity: Identity): Promise<boolean>;
  findEmail(email: string): Promise<Identity | undefined>;
  findIdentity(id: string): Promise<Identity | undefined>;
  /** Atomically checks credentials, revokes the old session, and inserts the new session. */
  createSession(
    session: SessionRecord,
    expectedHash: string | null,
    previousHash?: Buffer,
  ): Promise<boolean>;
  findSession(hash: Buffer, now: Date): Promise<Identity | undefined>;
  revokeSession(hash: Buffer, now: Date, all: boolean): Promise<void>;
  saveToken(token: TokenRecord): Promise<void>;
  /** Consumes once and updates credentials under the same identity lock as login. */
  consumeToken(hash: Buffer, kind: TokenKind, now: Date, passwordHash?: string): Promise<boolean>;
  findProvider(provider: string, subject: string): Promise<Identity | undefined>;
  /** Never links identities by email. Provider accounts start without an email. */
  createProviderIdentity(identity: Identity, provider: string, subject: string): Promise<Identity>;
  saveOAuthState(hash: Buffer, state: OAuthState): Promise<void>;
  consumeOAuthState(hash: Buffer, now: Date): Promise<OAuthState | undefined>;
}
