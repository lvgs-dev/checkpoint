import type { Role } from '../../../../packages/core/src/authorization.ts';
import { AppError } from '../shared/errors.ts';
import { db } from '../data/db.ts';
import { PgAuthRepository } from './postgres.ts';
import { AuthService } from './service.ts';
import { mailSenderFromEnv } from './mail.ts';

export interface AuthUser {
  id: string;
  email?: string;
  role: Role;
  emailVerified?: boolean;
}
export interface Authenticator {
  authenticate(cookie: string | undefined, clientKey?: string): Promise<AuthUser>;
  sessionService?: AuthService;
}
export const unauthorized = (message = 'Authentication required') => new AppError(message, 401);
export const SESSION_COOKIE = 'checkpoint_session';
export function cookieValue(header: string | undefined, name = SESSION_COOKIE): string | undefined {
  const values = (header ?? '').split(';').map((part) => part.trim());
  const matches = values.filter((part) => part.startsWith(name + '='));
  if (matches.length !== 1) return undefined;
  return matches[0].slice(name.length + 1);
}
export function createAuthenticator(service: AuthService): Authenticator {
  return {
    sessionService: service,
    async authenticate(cookie) {
      const token = cookieValue(cookie);
      if (!token) throw unauthorized();
      return service.lookup(token);
    },
  };
}
type Env = Record<string, string | undefined>;
const LOOPBACK = /^(localhost|::1|\[::1\]|127(\.\d{1,3}){3})$/;
export function assertNoAuthAllowed(env: Env, host: string): void {
  if (env.NODE_ENV === 'production' || !LOOPBACK.test(host))
    throw new Error('Authentication requires DATABASE_URL in production and on non-loopback hosts');
}
export function authenticatorFromEnv(env: Env = process.env): Authenticator | null {
  if (!env.DATABASE_URL) {
    if (env.NODE_ENV === 'production')
      return {
        authenticate: async () => {
          throw new AppError('Authentication unavailable', 503);
        },
      };
    return null;
  }
  if (
    !env.AUTH_ORIGIN ||
    (env.NODE_ENV === 'production' && new URL(env.AUTH_ORIGIN).protocol !== 'https:')
  )
    throw new Error('Set AUTH_ORIGIN; production requires HTTPS');
  return createAuthenticator(
    new AuthService(new PgAuthRepository(db(env.DATABASE_URL)), mailSenderFromEnv(env)),
  );
}
export function publicAuthConfig(env: Env = process.env) {
  return {
    auth:
      env.DATABASE_URL || env.NODE_ENV === 'production'
        ? { providers: { github: env.AUTH_GITHUB_ENABLED === 'true' } }
        : null,
  };
}
