import type {
  AuthRepository,
  Identity,
  OAuthState,
  SessionRecord,
  TokenKind,
  TokenRecord,
} from "../../src/auth/repository.ts";

export class MemoryAuthRepository implements AuthRepository {
  identities = new Map<string, Identity>();
  private sessions = new Map<string, SessionRecord & { revoked?: boolean }>();
  private tokens = new Map<string, TokenRecord & { used?: boolean }>();
  private providers = new Map<string, string>();
  private states = new Map<string, OAuthState>();
  async createIdentity(identity: Identity) {
    if ([...this.identities.values()].some((i) => i.email === identity.email)) return false;
    this.identities.set(identity.id, { ...identity, role: "user" });
    return true;
  }
  async findEmail(email: string) {
    return [...this.identities.values()].find((i) => i.email === email);
  }
  async findIdentity(id: string) {
    return this.identities.get(id);
  }
  async createSession(session: SessionRecord, expectedHash: string | null, previousHash?: Buffer) {
    const identity = this.identities.get(session.identityId);
    if (!identity || identity.disabledAt || identity.passwordHash !== expectedHash) return false;
    if (previousHash) {
      const previous = this.sessions.get(previousHash.toString("hex"));
      if (previous) previous.revoked = true;
    }
    this.sessions.set(session.tokenHash.toString("hex"), session);
    return true;
  }
  async findSession(hash: Buffer, now: Date) {
    const session = this.sessions.get(hash.toString("hex"));
    return session && !session.revoked && session.expiresAt > now
      ? this.identities.get(session.identityId)
      : undefined;
  }
  async revokeSession(hash: Buffer, now: Date, all: boolean) {
    const target = this.sessions.get(hash.toString("hex"));
    const revokeAll = all && target && !target.revoked && target.expiresAt > now;
    for (const session of this.sessions.values()) {
      if (session === target || (revokeAll && session.identityId === target?.identityId))
        session.revoked = true;
    }
  }
  async saveToken(token: TokenRecord) {
    this.tokens.set(token.tokenHash.toString("hex"), token);
  }
  async consumeToken(hash: Buffer, kind: TokenKind, now: Date, passwordHash?: string) {
    const token = this.tokens.get(hash.toString("hex"));
    if (!token || token.used || token.kind !== kind || token.expiresAt <= now) return false;
    const user = this.identities.get(token.identityId);
    if (!user || user.disabledAt) return false;
    token.used = true;
    user.emailVerified = true;
    if (kind === "reset_password") {
      user.passwordHash = passwordHash!;
      for (const session of this.sessions.values())
        if (session.identityId === user.id) session.revoked = true;
      for (const other of this.tokens.values()) if (other.identityId === user.id) other.used = true;
    }
    return true;
  }
  async findProvider(provider: string, subject: string) {
    return this.identities.get(this.providers.get(provider + ":" + subject) ?? "");
  }
  async createProviderIdentity(user: Identity, provider: string, subject: string) {
    const found = await this.findProvider(provider, subject);
    if (found) return found;
    this.identities.set(user.id, user);
    this.providers.set(provider + ":" + subject, user.id);
    return user;
  }
  async saveOAuthState(hash: Buffer, state: OAuthState) {
    this.states.set(hash.toString("hex"), state);
  }
  async consumeOAuthState(hash: Buffer, now: Date) {
    const state = this.states.get(hash.toString("hex"));
    this.states.delete(hash.toString("hex"));
    return state && state.expiresAt > now ? state : undefined;
  }
}
