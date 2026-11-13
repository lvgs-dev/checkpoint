const { readFileSync } = require("node:fs");

function fail() {
  console.error("API startup failed");
  process.exit(1);
}

try {
  const password = readFileSync(
    process.env.DB_PASSWORD_FILE || "/run/secrets/db_password",
    "utf8",
  ).trimEnd();
  const host = process.env.PGHOST || "db";
  const user = process.env.PGUSER || "app";
  const database = process.env.PGDATABASE || "app";
  process.env.DATABASE_URL = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${encodeURIComponent(database)}`;
  // The API runs the migrations (advisory lock and checksums) before it listens.
  // It reads SMTP_PASSWORD, AUTH_GITHUB_CLIENT_SECRET and MASTER_PASSWORD from <NAME>_FILE.
  require("./dist/index.js");
} catch {
  fail();
}
