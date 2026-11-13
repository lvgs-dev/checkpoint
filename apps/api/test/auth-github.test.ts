import { describe, expect, it, vi } from 'vitest';
import { GitHubOAuth } from '../src/auth/github.ts';
import { AuthService } from '../src/auth/service.ts';
import { MemoryAuthRepository } from './helpers/auth-repository.ts';

const env = { AUTH_GITHUB_ENABLED: 'true', AUTH_GITHUB_CLIENT_ID: 'fixture-client',
  AUTH_GITHUB_CLIENT_SECRET: 'fixture-secret', AUTH_ORIGIN: 'https://app.example' };
function setup() {
  const repository = new MemoryAuthRepository();
  const service = new AuthService(repository, { send: async () => {} });
  const request = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'provider-fixture' })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: 123, email: 'untrusted@example.com', role: 'admin' })));
  return { service, repository, request, oauth: new GitHubOAuth(service, env, request) };
}
describe('GitHub authentication', () => {
  it('sends PKCE and maps only the provider subject without trusting email or role', async () => {
    const { service, request, oauth } = setup();
    const start = await oauth.start('/jogos');
    const authorize = new URL(start.url);
    expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorize.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const result = await oauth.finish('code', start.state, start.state);
    expect(await service.lookup(result.token)).toMatchObject({ role: 'user', email: undefined });
    expect(result.redirectPath).toBe('/jogos');
    const body = request.mock.calls[0][1]!.body as URLSearchParams;
    expect(body.get('code_verifier')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    await expect(oauth.finish('code', start.state, start.state)).rejects.toMatchObject({ code: 400 });
  });
  it('rejects state mismatch before any external request', async () => {
    const { request, oauth } = setup();
    const start = await oauth.start('/jogos');
    await expect(oauth.finish('code', start.state, 'different')).rejects.toMatchObject({ code: 400 });
    expect(request).not.toHaveBeenCalled();
  });
  it('requires provider enablement', async () => {
    const { service, request } = setup();
    const oauth = new GitHubOAuth(service, { ...env, AUTH_GITHUB_ENABLED: 'false' }, request);
    await expect(oauth.start('/jogos')).rejects.toMatchObject({ code: 404 });
    expect(request).not.toHaveBeenCalled();
  });
  it('rejects control characters and external redirect targets', async () => {
    for (const redirect of ['//foreign.example', '/\t/foreign.example', '/\\foreign.example']) {
      const { oauth } = setup();
      const start = await oauth.start(redirect);
      const result = await oauth.finish('code', start.state, start.state);
      expect(result.redirectPath).toBe('/jogos');
    }
  });
  it('expires authorization state before provider exchange', async () => {
    const { oauth, request } = setup();
    const start = await oauth.start('/jogos');
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 11 * 60_000);
    try {
      await expect(oauth.finish('code', start.state, start.state)).rejects.toMatchObject({ code: 400 });
      expect(request).not.toHaveBeenCalled();
    } finally { clock.mockRestore(); }
  });
  it('preserves an imported provider mapping', async () => {
    const { repository, oauth } = setup();
    await repository.createProviderIdentity({ id: 'imported-identity', email: null,
      emailVerified: false, passwordHash: null, role: 'user', disabledAt: null }, 'github', '123');
    const start = await oauth.start('/ordem');
    const result = await oauth.finish('code', start.state, start.state);
    expect(result.user.id).toBe('imported-identity');
  });
});
