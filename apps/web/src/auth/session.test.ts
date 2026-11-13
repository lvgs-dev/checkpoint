import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthSession } from "./session";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function setup() {
  const user = { id: "identity", email: "player@gps.dev.br", role: "user" };
  const request = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ auth: { providers: { github: true } } })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ session: null })));
  vi.stubGlobal("fetch", request);
  vi.stubGlobal("location", {
    origin: "https://app.example",
    hash: "",
    pathname: "/login",
    search: "",
    assign: vi.fn(),
  });
  return { request, user, session: new AuthSession() };
}
describe("cookie authentication client", () => {
  it("restores a session with credentials and exposes provider flags", async () => {
    const { session, request } = setup();
    await session.init();
    expect(session.getState().githubEnabled).toBe(true);
    expect(request).toHaveBeenLastCalledWith(
      "/api/v1/auth/session",
      expect.objectContaining({ credentials: "include" }),
    );
  });
  it("logs in through the API without exposing a bearer token", async () => {
    const { session, request, user } = setup();
    await session.init();
    request.mockResolvedValueOnce(new Response(JSON.stringify({ session: { user } })));
    expect(await session.signIn("Player", "correct-password")).toEqual({ ok: true });
    const [url, options] = request.mock.calls.at(-1)!;
    expect(url).toBe("/api/v1/auth/login");
    expect(options.credentials).toBe("include");
    expect(JSON.parse(options.body)).toEqual({
      email: "player@gps.dev.br",
      password: "correct-password",
    });
    expect(session.getState().session?.user.id).toBe(user.id);
    expect(options.headers.Authorization).toBeUndefined();
  });
  it("clears identity and emits signed out only after server logout succeeds", async () => {
    const { session, request } = setup();
    await session.init();
    const listener = vi.fn();
    session.onEvent(listener);
    request.mockResolvedValueOnce(new Response(JSON.stringify({ session: null })));
    await session.signOut("global");
    expect(JSON.parse(request.mock.calls.at(-1)![1].body)).toEqual({ all: true });
    expect(listener).toHaveBeenCalledWith("SIGNED_OUT");
  });
  it("keeps recovery credentials in memory and removes the URL fragment", async () => {
    const { session, request } = setup();
    const replaceState = vi.fn();
    vi.stubGlobal("history", { replaceState });
    vi.stubGlobal("location", {
      origin: "https://app.example",
      pathname: "/redefinir-senha",
      search: "",
      hash: "#recovery_token=recovery-fixture",
    });
    await session.init();
    expect(session.getState().recoveryAvailable).toBe(true);
    expect(session.getState().session).toBeNull();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/redefinir-senha");
    request.mockResolvedValueOnce(new Response(JSON.stringify({ session: null })));
    expect((await session.updatePassword("replacement-password")).ok).toBe(true);
    expect(JSON.parse(request.mock.calls.at(-1)![1].body)).toEqual({
      token: "recovery-fixture",
      password: "replacement-password",
    });
    expect(session.getState().recoveryAvailable).toBe(false);
    expect((await session.updatePassword("replacement-password")).ok).toBe(false);
  });
  it("shows initialization failures and keeps auth enabled", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const session = new AuthSession();
    await session.init();
    expect(session.getState()).toMatchObject({ ready: true, enabled: true });
    expect(session.getState().initError).not.toBe("");
  });
  it("records disabled local auth from public configuration", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ auth: null }))));
    const session = new AuthSession();
    await session.init();
    expect(session.getState().enabled).toBe(false);
    expect((await session.signIn("player", "correct-password")).ok).toBe(false);
  });
});
