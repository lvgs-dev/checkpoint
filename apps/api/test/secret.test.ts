import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { readSecret } from "../src/shared/secret.ts";
import { mailSenderFromEnv } from "../src/auth/mail.ts";

const dir = mkdtempSync(join(tmpdir(), "secret-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const file = (name: string, text: string) => {
  const path = join(dir, name);
  writeFileSync(path, text);
  return path;
};

describe("readSecret", () => {
  it("prefers the environment value", () => {
    expect(readSecret("X", { X: "direct", X_FILE: file("a", "from-file") })).toBe("direct");
  });
  it("reads the file named by <NAME>_FILE and trims the trailing newline", () => {
    expect(readSecret("X", { X_FILE: file("b", "from-file\n") })).toBe("from-file");
  });
  it("returns undefined when neither is set", () => {
    expect(readSecret("X", {})).toBeUndefined();
  });
  it("fails without echoing the value when the file is unreadable", () => {
    expect(() => readSecret("X", { X_FILE: join(dir, "missing") })).toThrow("X_FILE");
  });
});

describe("SMTP password file", () => {
  it("builds the sender from SMTP_PASSWORD_FILE", () => {
    const env = {
      SMTP_HOST: "smtp.example",
      SMTP_FROM: "a@example.com",
      AUTH_ORIGIN: "https://game-list.gps.dev.br",
      SMTP_PASSWORD_FILE: file("smtp", "pw\n"),
    };
    expect(() => mailSenderFromEnv(env)).not.toThrow();
  });
});
