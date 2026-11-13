import { describe, expect, it } from "vitest";
import { AuthService } from "../src/auth/service.ts";
import { MemoryAuthRepository } from "./helpers/auth-repository.ts";
import { assertOrigin, sessionCookie } from "../src/auth/http.ts";

function setup() {
  let now = Date.now();
  const messages: { kind: string; token: string }[] = [];
  const repository = new MemoryAuthRepository();
  const service = new AuthService(
    repository,
    {
      send: async (message) => {
        messages.push(message);
      },
    },
    { now: () => now },
  );
  return {
    service,
    repository,
    messages,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

async function account() {
  const context = setup();
  await context.service.register("Player", "correct-password");
  await context.service.verifyEmail(context.messages[0].token);
  return context;
}

describe("own authentication", () => {
  it("requires verified email and keeps the username alias", async () => {
    const { service, messages } = setup();
    await service.register("Player", "correct-password");
    await expect(service.login("player", "correct-password", "client")).rejects.toMatchObject({
      code: 401,
    });
    await service.verifyEmail(messages[0].token);
    const login = await service.login("PLAYER", "correct-password", "client");
    const user = await service.lookup(login.token);
    expect(user.email).toBe("player@gps.dev.br");
    expect(user.role).toBe("user");
    await expect(service.verifyEmail(messages[0].token)).rejects.toMatchObject({ code: 400 });
  });

  it("rotates login sessions and revokes local and global sessions", async () => {
    const { service } = await account();
    const first = await service.login("player", "correct-password", "a");
    const second = await service.login("player", "correct-password", "b", first.token);
    expect(first.token).not.toBe(second.token);
    await expect(service.lookup(first.token)).rejects.toMatchObject({ code: 401 });
    const third = await service.login("player", "correct-password", "c");
    await service.logout(second.token);
    await expect(service.lookup(second.token)).rejects.toMatchObject({ code: 401 });
    await service.lookup(third.token);
    const fourth = await service.login("player", "correct-password", "d");
    await service.logout(third.token, true);
    await expect(service.lookup(fourth.token)).rejects.toMatchObject({ code: 401 });
  });

  it("expires sessions and single-use recovery tokens", async () => {
    const { service, messages, advance } = await account();
    const login = await service.login("player", "correct-password", "a");
    await service.requestReset("player");
    const reset = messages.at(-1)!.token;
    await service.resetPassword(reset, "replacement-password");
    await expect(service.lookup(login.token)).rejects.toMatchObject({ code: 401 });
    await expect(service.resetPassword(reset, "another-password")).rejects.toMatchObject({
      code: 400,
    });
    await expect(service.login("player", "correct-password", "b")).rejects.toMatchObject({
      code: 401,
    });
    const fresh = await service.login("player", "replacement-password", "c");
    advance(31 * 24 * 60 * 60_000);
    await expect(service.lookup(fresh.token)).rejects.toMatchObject({ code: 401 });
    await service.requestReset("player");
    advance(61 * 60_000);
    await expect(
      service.resetPassword(messages.at(-1)!.token, "another-password"),
    ).rejects.toMatchObject({ code: 400 });
  });

  it("keeps reset responses neutral and rejects tokens for another purpose", async () => {
    const { service, messages } = await account();
    expect(await service.requestReset("missing")).toBeUndefined();
    const count = messages.length;
    await service.register("player", "another-password");
    expect(messages).toHaveLength(count);
    await service.requestReset("player");
    const reset = messages.at(-1)!.token;
    await expect(service.verifyEmail(reset)).rejects.toMatchObject({ code: 400 });
    await service.resetPassword(reset, "replacement-password");
  });

  it("expires verification links without changing credentials", async () => {
    const { service, messages, advance } = setup();
    await service.register("expiry-player", "correct-password");
    advance(61 * 60_000);
    await expect(service.verifyEmail(messages[0].token)).rejects.toMatchObject({ code: 400 });
    await expect(service.login("expiry-player", "correct-password", "a")).rejects.toMatchObject({
      code: 401,
    });
  });

  it("reads role and disabled status from storage on each lookup", async () => {
    const { service, repository } = await account();
    const login = await service.login("player", "correct-password", "a");
    const identity = [...repository.identities.values()][0];
    identity.role = "admin";
    expect((await service.lookup(login.token)).role).toBe("admin");
    identity.disabledAt = new Date();
    await expect(service.lookup(login.token)).rejects.toMatchObject({ code: 401 });
  });

  it("limits accounts across addresses and addresses across accounts", async () => {
    const { service } = setup();
    for (let i = 0; i < 10; i++) {
      await expect(service.login("missing", "wrong-password", `ip-${i}`)).rejects.toMatchObject({
        code: 401,
      });
    }
    await expect(service.login("missing", "wrong-password", "new-ip")).rejects.toMatchObject({
      code: 429,
    });
    for (let i = 0; i < 30; i++) {
      await expect(service.login(`other-${i}`, "wrong-password", "same-ip")).rejects.toMatchObject({
        code: 401,
      });
    }
    await expect(service.login("next", "wrong-password", "same-ip")).rejects.toMatchObject({
      code: 429,
    });
  }, 30_000);

  it("rejects foreign and missing origins and sets secure cookie attributes", () => {
    expect(() => assertOrigin("POST", "https://foreign.example", "https://app.example")).toThrow();
    expect(() => assertOrigin("POST", undefined, "https://app.example")).toThrow();
    expect(() => assertOrigin("POST", "https://app.example", "https://app.example")).not.toThrow();
    expect(() => assertOrigin("GET", undefined, "https://app.example")).not.toThrow();
    expect(sessionCookie("opaque", true)).toContain("HttpOnly; Secure; SameSite=Lax");
    expect(sessionCookie("opaque", true)).not.toContain("Domain=");
  });
});
