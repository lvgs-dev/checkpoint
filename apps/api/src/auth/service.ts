import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AppError } from '../shared/errors.ts';
import { createRateLimiter } from './rate-limit.ts';
import { hashPassword, verifyPassword } from './password.ts';
import type { AuthRepository, Identity, TokenKind } from './repository.ts';

export interface AuthMail {
  email: string;
  kind: TokenKind;
  token: string;
}
export interface MailSender {
  send(message: AuthMail): Promise<void>;
}
export const tokenHash = (token: string) => createHash('sha256').update(token).digest();
export const newToken = () => randomBytes(32).toString('base64url');
const HOUR = 60 * 60_000;
export const SESSION_MS = 30 * 24 * HOUR;
const invalid = () => new AppError('Invalid credentials or expired session', 401);

export function normalizeLogin(input: string): string {
  const value = input.trim().toLowerCase();
  const email = value.includes('@') ? value : `${value}@gps.dev.br`;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new AppError('Invalid email', 400);
  return email;
}
function checkPassword(password: string) {
  if (password.length < 8 || Buffer.byteLength(password) > 1024)
    throw new AppError('Password must contain at least 8 characters and at most 1024 bytes', 400);
}
export class AuthService {
  private accountLimit = createRateLimiter(10, 15 * 60_000);
  private addressLimit = createRateLimiter(30, 15 * 60_000);
  private mailLimit = createRateLimiter(3, HOUR);
  private now: () => number;
  readonly repository: AuthRepository;
  private mail: MailSender;
  constructor(repository: AuthRepository, mail: MailSender, options: { now?: () => number } = {}) {
    this.repository = repository;
    this.mail = mail;
    this.now = options.now ?? Date.now;
  }
  async register(login: string, password: string): Promise<void> {
    const email = normalizeLogin(login);
    checkPassword(password);
    if (!this.mailLimit('register:' + email, this.now()))
      throw new AppError('Too many requests', 429);
    const identity: Identity = {
      id: randomUUID(),
      email,
      emailVerified: false,
      passwordHash: await hashPassword(password),
      role: 'user',
      disabledAt: null,
    };
    // Duplicate addresses receive the same public response.
    if (await this.repository.createIdentity(identity))
      await this.sendToken(identity, 'verify_email');
  }
  private async sendToken(identity: Identity, kind: TokenKind) {
    if (!identity.email) return;
    const token = newToken();
    await this.repository.saveToken({
      id: randomUUID(),
      identityId: identity.id,
      kind,
      tokenHash: tokenHash(token),
      expiresAt: new Date(this.now() + HOUR),
    });
    await this.mail.send({ email: identity.email, kind, token });
  }
  async verifyEmail(token: string): Promise<void> {
    if (
      !(await this.repository.consumeToken(tokenHash(token), 'verify_email', new Date(this.now())))
    )
      throw new AppError('Invalid or expired verification link', 400);
  }
  async requestReset(login: string): Promise<void> {
    const email = normalizeLogin(login);
    if (!this.mailLimit('reset:' + email, this.now())) return;
    const identity = await this.repository.findEmail(email);
    if (identity && !identity.disabledAt) await this.sendToken(identity, 'reset_password');
  }
  async resetPassword(token: string, password: string): Promise<void> {
    checkPassword(password);
    const hash = await hashPassword(password);
    if (
      !(await this.repository.consumeToken(
        tokenHash(token),
        'reset_password',
        new Date(this.now()),
        hash,
      ))
    )
      throw new AppError('Invalid or expired recovery link', 400);
  }
  async login(login: string, password: string, address: string, previous?: string, userAgent = '') {
    const email = normalizeLogin(login);
    const accountAllowed = this.accountLimit(tokenHash(email).toString('hex'), this.now());
    const addressAllowed = this.addressLimit(address, this.now());
    if (!accountAllowed || !addressAllowed) throw new AppError('Too many login attempts', 429);
    if (Buffer.byteLength(password) > 1024) throw invalid();
    const identity = await this.repository.findEmail(email);
    // Perform the same password work for missing accounts.
    const dummy = 'scrypt$32768$8$1$' + '00'.repeat(16) + '$' + '00'.repeat(64);
    const valid = await verifyPassword(password, identity?.passwordHash ?? dummy);
    if (!valid || !identity || identity.disabledAt || !identity.emailVerified) throw invalid();
    return this.issueSession(identity, previous, userAgent);
  }
  async issueSession(identity: Identity, previous?: string, userAgent = '') {
    if (identity.disabledAt) throw invalid();
    const token = newToken();
    const expiresAt = new Date(this.now() + SESSION_MS);
    const saved = await this.repository.createSession(
      {
        id: randomUUID(),
        identityId: identity.id,
        tokenHash: tokenHash(token),
        expiresAt,
        userAgent: userAgent.slice(0, 512),
      },
      identity.passwordHash,
      previous ? tokenHash(previous) : undefined,
    );
    if (!saved) throw invalid();
    return { token, expiresAt, user: this.publicUser(identity) };
  }
  async lookup(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw invalid();
    const identity = await this.repository.findSession(tokenHash(token), new Date(this.now()));
    if (!identity || identity.disabledAt) throw invalid();
    return this.publicUser(identity);
  }
  async logout(token: string, all = false) {
    await this.repository.revokeSession(tokenHash(token), new Date(this.now()), all);
  }
  publicUser(identity: Identity) {
    return {
      id: identity.id,
      email: identity.email ?? undefined,
      role: identity.role,
      emailVerified: identity.emailVerified,
    };
  }
}
