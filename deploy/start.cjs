const { readFileSync } = require("node:fs");
const { Client } = require("pg");

function fail() {
  console.error("API startup failed");
  process.exit(1);
}

async function start() {
  const client = new Client({
    host: process.env.PGHOST || "db",
    user: process.env.PGUSER || "app",
    database: process.env.PGDATABASE || "app",
    password: readFileSync("/run/secrets/db_password", "utf8").trimEnd(),
  });
  client.on("error", fail);
  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock(74201901)");
    // Migrations use this connection so lock loss also stops their database work.
    await require("./dist/migrate.js")(client);
  } finally {
    await client.end();
  }
  require("./dist/index.js");
}
start().catch(fail);
