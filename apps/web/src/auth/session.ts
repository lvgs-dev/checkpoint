import type { Role } from '../../../../packages/core/src/authorization';

export interface AuthUser { id: string; email?: string; role: Role; emailVerified?: boolean }
export interface Session { user: AuthUser }
export type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY';
export type AuthResult = { ok: true; message?: string } | { ok: false; message: string };
export interface AuthState {
  recoveryAvailable?: boolean;
  ready: boolean;
  enabled: boolean;
  githubEnabled: boolean;
  session: Session | null;
  initError: string;
}
interface AuthResponse { session?: Session | null; message?: string; detail?: string }

/** Holds public identity data only. The browser sends the HttpOnly session cookie. */
export class AuthSession {
  private initializing?: Promise<void>;
  private listeners = new Set<() => void>();
  private eventListeners = new Set<(event: AuthChangeEvent) => void>();
  private recoveryToken?: string;
  private state: AuthState = { ready: false, enabled: true, githubEnabled: false, session: null, initError: '' };
  get enabled() { return this.state.enabled; }
  getState = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => void this.listeners.delete(listener); };
  onEvent(listener: (event: AuthChangeEvent) => void) {
    this.eventListeners.add(listener);
    return () => void this.eventListeners.delete(listener);
  }
  private set(patch: Partial<AuthState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach((listener) => listener()); }
  private emit(event: AuthChangeEvent) { this.eventListeners.forEach((listener) => listener(event)); }
  init(): Promise<void> {
    this.initializing ??= this.load().finally(() => this.set({ ready: true }));
    return this.initializing;
  }
  private async load() {
    try {
      const response = await fetch('/api/v1/config', { credentials: 'include', signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error('Configuration unavailable');
      const config = await response.json() as { auth: { providers: { github: boolean } } | null };
      if (!config.auth) { this.set({ enabled: false }); return; }
      this.set({ githubEnabled: config.auth.providers.github });
      await this.restore();
      if (typeof location !== 'undefined') {
        const token = new URLSearchParams(location.hash.slice(1)).get('recovery_token');
        if (token) {
          this.recoveryToken = token;
          this.set({ recoveryAvailable: true });
          history.replaceState(null, '', location.pathname + location.search);
          this.emit('PASSWORD_RECOVERY');
        }
      }
    } catch { this.set({ initError: 'Authentication configuration unavailable. Try again.' }); }
  }
  async restore(): Promise<void> {
    const response = await fetch('/api/v1/auth/session', { credentials: 'include', signal: AbortSignal.timeout(10_000) });
    if (response.status === 401) { this.clear(); return; }
    if (!response.ok) throw new Error('Session unavailable');
    const data = await response.json() as AuthResponse;
    this.set({ session: data.session ?? null });
  }
  clear(): void { this.set({ session: null }); this.emit('SIGNED_OUT'); }
  private async post(path: string, body: Record<string, unknown>): Promise<AuthResult> {
    if (!this.state.enabled) return { ok: false, message: 'Authentication unavailable.' };
    try {
      const response = await fetch('/api/v1/auth/' + path, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: AbortSignal.timeout(10_000),
      });
      const data = await response.json() as AuthResponse;
      if (!response.ok) return { ok: false, message: data.detail ?? data.message ?? 'Authentication failed.' };
      if ('session' in data) this.set({ session: data.session ?? null });
      return data.message ? { ok: true, message: data.message } : { ok: true };
    } catch { return { ok: false, message: 'Cannot connect to authentication server.' }; }
  }
  private email(login: string) { const value = login.trim().toLowerCase(); return value.includes('@') ? value : value + '@gps.dev.br'; }
  async signIn(login: string, password: string): Promise<AuthResult> {
    const result = await this.post('login', { email: this.email(login), password });
    if (result.ok) this.emit('SIGNED_IN');
    return result;
  }
  signUp(email: string, password: string) { return this.post('register', { email: this.email(email), password }); }
  resetPassword(email: string) { return this.post('request-reset', { email: this.email(email) }); }
  async updatePassword(password: string): Promise<AuthResult> {
    if (!this.recoveryToken) return { ok: false, message: 'Open the recovery link from your email.' };
    const result = await this.post('reset-password', { token: this.recoveryToken, password });
    if (result.ok) { this.recoveryToken = undefined; this.set({ recoveryAvailable: false }); this.clear(); }
    return result;
  }
  async signInWithGitHub(redirect = '/jogos'): Promise<AuthResult> {
    if (!this.state.githubEnabled) return { ok: false, message: 'GitHub login unavailable.' };
    location.assign('/api/v1/auth/github?redirect=' + encodeURIComponent(redirect));
    return { ok: true };
  }
  async signOut(scope: 'global' | 'local' = 'local'): Promise<void> {
    const result = await this.post('logout', { all: scope === 'global' });
    if (!result.ok) throw new Error(result.message);
    this.clear();
  }
}
export const authSession = new AuthSession();
