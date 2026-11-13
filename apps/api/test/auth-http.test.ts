import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { AuthService } from '../src/auth/service.ts';
import { authRoute } from '../src/auth/http.ts';
import { createAuthenticator } from '../src/auth/auth.ts';
import { MemoryAuthRepository } from './helpers/auth-repository.ts';

const env = { AUTH_ORIGIN: 'https://app.example', NODE_ENV: 'production' };
function fixture() {
  const messages: { token: string }[] = [];
  const service = new AuthService(new MemoryAuthRepository(), { send: async (mail) => { messages.push(mail); } });
  const call = async (path: string, body: Record<string, unknown> = {}, origin: string | null = env.AUTH_ORIGIN, cookie?: string, method = 'POST') => {
    const headers = new Map<string, unknown>();
    let status = 0;
    let result = '';
    const req = { method, headers: { origin: origin ?? undefined, cookie }, socket: { remoteAddress: 'http-fixture' } } as unknown as IncomingMessage;
    const res = { setHeader: (key: string, value: unknown) => headers.set(key, value),
      writeHead: (code: number) => { status = code; }, end: (value: string) => { result = value; } } as unknown as ServerResponse;
    await authRoute(service, req, res, new URL('/api/v1/auth/' + path, env.AUTH_ORIGIN), async () => body, env);
    return { headers, status, data: result ? JSON.parse(result) : null };
  };
  return { service, messages, call };
}
describe('authentication HTTP boundary', () => {
  it('ignores client roles, sets a cookie and accepts only cookie credentials', async () => {
    const { service, messages, call } = fixture();
    await call('register', { email: 'http-player', password: 'correct-password', role: 'admin' });
    await call('verify-email', { token: messages[0].token });
    const response = await call('login', { email: 'http-player', password: 'correct-password', role: 'admin' });
    expect(response.data.session.user.role).toBe('user');
    expect(response.data.token).toBeUndefined();
    const cookie = String(response.headers.get('Set-Cookie'));
    expect(cookie).toContain('HttpOnly; Secure; SameSite=Lax');
    const authenticator = createAuthenticator(service);
    expect((await authenticator.authenticate(cookie)).role).toBe('user');
    await expect(authenticator.authenticate('Bearer ' + cookie.split('=')[1])).rejects.toMatchObject({ code: 401 });
    await call('logout', {}, env.AUTH_ORIGIN, cookie);
    await expect(authenticator.authenticate(cookie)).rejects.toMatchObject({ code: 401 });
  });
  it('rejects foreign and missing origins before registration', async () => {
    const { call, messages } = fixture();
    const body = { email: 'blocked@example.com', password: 'correct-password' };
    await expect(call('register', body, 'https://foreign.example')).rejects.toMatchObject({ code: 403 });
    await expect(call('register', body, null)).rejects.toMatchObject({ code: 403 });
    expect(messages).toHaveLength(0);
  });
});
