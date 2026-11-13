// Secrets come from the environment or, in containers, from the file named by <NAME>_FILE.
import { readFileSync } from "node:fs";

type Env = Record<string, string | undefined>;

export function readSecret(name: string, env: Env = process.env): string | undefined {
  if (env[name]) return env[name];
  const path = env[`${name}_FILE`];
  if (!path) return undefined;
  try {
    return readFileSync(path, "utf8").replace(/\r?\n$/, "");
  } catch {
    throw new Error(`${name}_FILE is not readable`);
  }
}
