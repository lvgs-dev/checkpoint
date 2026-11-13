import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/auth/password.ts";
import { assertNoAuthAllowed, authenticatorFromEnv, publicAuthConfig } from "../src/auth/auth.ts";

describe("password hashing and configuration", () => {
  it("uses salted scrypt and rejects wrong passwords and malformed hashes", async () => {
    const first = await hashPassword("correct-password");
    const second = await hashPassword("correct-password");
    expect(first).toMatch(/^scrypt\$32768\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
    expect(second).not.toBe(first);
    expect(await verifyPassword("correct-password", first)).toBe(true);
    expect(await verifyPassword("wrong-password", first)).toBe(false);
    expect(await verifyPassword("correct-password", "unsupported")).toBe(false);
  });
  it("fails closed in production without database configuration", async () => {
    const auth = authenticatorFromEnv({ NODE_ENV: "production" });
    await expect(auth!.authenticate(undefined)).rejects.toMatchObject({ code: 503 });
    expect(publicAuthConfig({ NODE_ENV: "production" }).auth).not.toBeNull();
    expect(() => assertNoAuthAllowed({ NODE_ENV: "production" }, "127.0.0.1")).toThrow();
  });
  it("allows unauthenticated development only on loopback", () => {
    expect(authenticatorFromEnv({ NODE_ENV: "development" })).toBeNull();
    expect(() => assertNoAuthAllowed({ NODE_ENV: "development" }, "127.0.0.1")).not.toThrow();
    expect(() => assertNoAuthAllowed({ NODE_ENV: "development" }, "0.0.0.0")).toThrow();
  });
});
