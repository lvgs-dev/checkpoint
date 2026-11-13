// Throwaway PostgreSQL 17 for database tests.
import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const infra = fileURLToPath(new URL("../infra/", import.meta.url));
const migrations = fileURLToPath(new URL("../db/migrations/", import.meta.url));
const COMPOSE = ["compose", "-f", infra + "docker-compose.test.yml"];
export const CONTAINER = "checkpoint-test-db";
export const DB_NAME = "checkpoint_security_vitest";
export const DB_URL = "postgres://postgres:checkpoint-test@127.0.0.1:54329/" + DB_NAME;

const docker = (args, input) =>
  execFileSync("docker", args, { input, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });

const psql = (sql, db = DB_NAME) =>
  docker(
    ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-qtA"],
    sql,
  );

export const isHealthy = () => {
  const result = spawnSync("docker", ["inspect", "-f", "{{.State.Health.Status}}", CONTAINER], {
    encoding: "utf8",
  });
  return result.status === 0 && result.stdout.trim() === "healthy";
};

export const isMigrated = () => {
  try {
    const expected = readdirSync(migrations)
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map(
        (name) =>
          name +
          ":" +
          createHash("sha256")
            .update(readFileSync(migrations + name))
            .digest("hex"),
      );
    const actual = psql(
      "SELECT version || ':' || checksum FROM public.schema_migration ORDER BY version",
    )
      .trim()
      .split("\n");
    return actual.join("\n") === expected.join("\n");
  } catch {
    return false;
  }
};

function up() {
  docker([...COMPOSE, "up", "-d", "--wait"]);
  const exists = psql(
    "SELECT 1 FROM pg_database WHERE datname = '" + DB_NAME + "'",
    "postgres",
  ).trim();
  if (!exists) psql("CREATE DATABASE " + DB_NAME, "postgres");
  execFileSync(
    process.execPath,
    [fileURLToPath(new URL("../src/data/migrate-cli.ts", import.meta.url))],
    { env: { ...process.env, DATABASE_URL: DB_URL }, stdio: "inherit" },
  );
  psql(readFileSync(new URL("../db/seed.sql", import.meta.url), "utf8"));
}

const down = () => docker([...COMPOSE, "down", "--volumes"]);
const commands = { up, down, reset: () => (down(), up()) };
if (import.meta.url === "file://" + process.argv[1]) {
  const run = commands[process.argv[2]];
  if (!run) {
    console.error("usage: test-db.mjs up|down|reset");
    process.exit(2);
  }
  run();
  if (process.argv[2] !== "down") console.log("SECURITY_TEST_DATABASE_URL=" + DB_URL);
}
