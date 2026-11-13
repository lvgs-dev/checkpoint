import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRateLimiter } from './rate-limit.ts';
import { AppError } from '../shared/errors.ts';
import { cookieValue, SESSION_COOKIE } from './auth.ts';
import { GitHubOAuth } from './github.ts';
import { SESSION_MS, type AuthService } from './service.ts';

export function assertOrigin(
  method: string | undefined,
  origin: string | undefined,
  expected: string,
) {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;
  if (!origin || origin !== new URL(expected).origin) throw new AppError('Origin rejected', 403);
}
export function sessionCookie(
  token: string,
  secure: boolean,
  maxAge = SESSION_MS / 1000,
  name = SESSION_COOKIE,
) {
  return `${name}=${token}; Path=/; HttpOnly; ${secure ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${maxAge}`;
}
const text = (body: Record<string, unknown>, key: string) => {
  const value = body[key];
  if (typeof value !== 'string' || value.length > 2048) throw new AppError('Invalid ' + key, 400);
  return value;
};
const allowAddress = createRateLimiter(60, 15 * 60_000);
type Env = Record<string, string | undefined>;
export async function authRoute(
  service: AuthService,
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  readJson: () => Promise<Record<string, unknown>>,
  env: Env = process.env,
): Promise<boolean> {
  const prefix = '/api/v1/auth/';
  if (!url.pathname.startsWith(prefix)) return false;
  const origin = env.AUTH_ORIGIN;
  if (!origin) throw new AppError('Authentication unavailable', 503);
  assertOrigin(req.method, req.headers.origin, origin);
  const secure = new URL(origin).protocol === 'https:' || env.NODE_ENV === 'production';
  const token = cookieValue(req.headers.cookie);
  const route = url.pathname.slice(prefix.length);
  const client = req.socket.remoteAddress ?? 'unknown';
  const agent = req.headers['user-agent'] ?? '';
  if (!allowAddress(client)) throw new AppError('Too many authentication requests', 429);
  const send = (data: unknown, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  };
  const redirect = (path: string) => {
    res.writeHead(303, { Location: path, 'Cache-Control': 'no-store' });
    res.end();
  };
  const setSession = (value: string) => res.setHeader('Set-Cookie', sessionCookie(value, secure));
  if (route === 'session' && req.method === 'GET') {
    send({ session: token ? { user: await service.lookup(token) } : null });
    return true;
  }
  if (route === 'verify-email' && req.method === 'GET') {
    await service.verifyEmail(url.searchParams.get('token') ?? '');
    redirect('/login');
    return true;
  }
  if (route === 'github' && req.method === 'GET') {
    const started = await new GitHubOAuth(service, env).start(
      url.searchParams.get('redirect') ?? '/jogos',
    );
    res.setHeader('Set-Cookie', sessionCookie(started.state, secure, 600, 'checkpoint_oauth'));
    redirect(started.url);
    return true;
  }
  if (route === 'github/callback' && req.method === 'GET') {
    const result = await new GitHubOAuth(service, env).finish(
      url.searchParams.get('code') ?? '',
      url.searchParams.get('state') ?? '',
      cookieValue(req.headers.cookie, 'checkpoint_oauth'),
      token,
      agent,
    );
    res.setHeader('Set-Cookie', [
      sessionCookie(result.token, secure),
      sessionCookie('', secure, 0, 'checkpoint_oauth'),
    ]);
    redirect(result.redirectPath);
    return true;
  }
  if (req.method !== 'POST') throw new AppError('Method not allowed', 405);
  const body = await readJson();
  switch (route) {
    case 'register':
      await service.register(text(body, 'email'), text(body, 'password'));
      send(
        { message: 'If registration is available, check your email to verify the account.' },
        202,
      );
      break;
    case 'login': {
      const result = await service.login(
        text(body, 'email'),
        text(body, 'password'),
        client,
        token,
        agent,
      );
      setSession(result.token);
      send({ session: { user: result.user } });
      break;
    }
    case 'logout':
      if (token) {
        if (body.all === true) await service.lookup(token);
        await service.logout(token, body.all === true);
      }
      res.setHeader('Set-Cookie', sessionCookie('', secure, 0));
      send({ session: null });
      break;
    case 'request-reset':
      await service.requestReset(text(body, 'email'));
      send({ message: 'If the account exists, check your email for a recovery link.' }, 202);
      break;
    case 'reset-password':
      await service.resetPassword(text(body, 'token'), text(body, 'password'));
      res.setHeader('Set-Cookie', sessionCookie('', secure, 0));
      send({ session: null, message: 'Password changed. Sign in again.' });
      break;
    case 'verify-email':
      await service.verifyEmail(text(body, 'token'));
      send({ message: 'Email verified.' });
      break;
    default:
      throw new AppError('Route not found', 404);
  }
  return true;
}
