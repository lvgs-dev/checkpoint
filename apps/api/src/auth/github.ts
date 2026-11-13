import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { AppError } from '../shared/errors.ts';
import { newToken, tokenHash, type AuthService } from './service.ts';
import type { Identity } from './repository.ts';

type Env = Record<string, string | undefined>;
export class GitHubOAuth {
  private service: AuthService;
  private env: Env;
  private request: typeof fetch;
  constructor(service: AuthService, env: Env, request: typeof fetch = fetch) {
    this.service = service;
    this.env = env;
    this.request = request;
  }
  private config() {
    const env = this.env;
    if (env.AUTH_GITHUB_ENABLED !== 'true') throw new AppError('GitHub login disabled', 404);
    if (!env.AUTH_GITHUB_CLIENT_ID || !env.AUTH_GITHUB_CLIENT_SECRET || !env.AUTH_ORIGIN)
      throw new AppError('GitHub login unavailable', 503);
    return { clientId: env.AUTH_GITHUB_CLIENT_ID, secret: env.AUTH_GITHUB_CLIENT_SECRET,
      callback: new URL('/api/v1/auth/github/callback', env.AUTH_ORIGIN).href };
  }
  async start(redirect: string) {
    const config = this.config();
    const state = newToken();
    const verifier = newToken();
    let redirectPath = '/jogos';
    if (/^\/(?!\/)/.test(redirect) && !/[\\\x00-\x20\x7f]/.test(redirect)) {
      const target = new URL(redirect, this.env.AUTH_ORIGIN);
      if (target.origin === new URL(this.env.AUTH_ORIGIN!).origin)
        redirectPath = target.pathname + target.search + target.hash;
    }
    await this.service.repository.saveOAuthState(tokenHash(state), { verifier, redirectPath, expiresAt: new Date(Date.now() + 10 * 60_000) });
    const url = new URL('https://github.com/login/oauth/authorize');
    url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.callback,
      state, scope: 'read:user', code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256' }).toString();
    return { state, url: url.href };
  }
  async finish(code: string, state: string, cookie: string | undefined, previous?: string, userAgent = '') {
    const config = this.config();
    if (!cookie || !/^[A-Za-z0-9_-]{43}$/.test(state) || !code || code.length > 512 ||
      !timingSafeEqual(tokenHash(state), tokenHash(cookie))) throw new AppError('Invalid OAuth state', 400);
    const saved = await this.service.repository.consumeOAuthState(tokenHash(state), new Date(Date.now()));
    if (!saved) throw new AppError('Expired OAuth state', 400);
    const response = await this.request('https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: config.clientId, client_secret: config.secret, code,
        redirect_uri: config.callback, code_verifier: saved.verifier }), signal: AbortSignal.timeout(10_000),
    });
    const result = await response.json() as { access_token?: string };
    if (!response.ok || !result.access_token) throw new AppError('GitHub authentication failed', 401);
    const profile = await this.request('https://api.github.com/user', {
      headers: { Authorization: 'Bearer ' + result.access_token, Accept: 'application/vnd.github+json', 'User-Agent': 'checkpoint' },
      signal: AbortSignal.timeout(10_000),
    });
    const user = await profile.json() as { id?: unknown };
    if (!profile.ok || typeof user.id !== 'number' || !Number.isSafeInteger(user.id) || user.id <= 0)
      throw new AppError('GitHub identity unavailable', 401);
    const subject = String(user.id);
    const identity: Identity = await this.service.repository.findProvider('github', subject) ??
      await this.service.repository.createProviderIdentity({ id: randomUUID(), email: null, emailVerified: false,
        passwordHash: null, role: 'user', disabledAt: null }, 'github', subject);
    return { ...await this.service.issueSession(identity, previous, userAgent), redirectPath: saved.redirectPath };
  }
}
