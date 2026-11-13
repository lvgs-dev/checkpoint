import { describe, expect, it } from "vitest";
import { applyMigrations, type MigrationClient } from "../src/data/migrate.ts";

function fake(applied: { version: string; checksum: string }[] = [], fail = false) {
  const events: string[] = [];
  const client: MigrationClient = {
    async query(sql, parameters = []) {
      events.push(sql);
      if (sql.startsWith("SELECT version")) return applied;
      if (sql.startsWith("INSERT INTO")) {
        applied.push({ version: String(parameters[0]), checksum: String(parameters[1]) });
      }
      if (fail && sql === "broken") throw new Error("SQL failed");
      return [];
    },
    async transaction(run) {
      events.push("BEGIN");
      try {
        await run(client);
        events.push("COMMIT");
      } catch (error) {
        events.push("ROLLBACK");
        throw error;
      }
    },
  };
  return { client, events, applied };
}

const files = [
  { version: "0002_second.sql", sql: "second" },
  { version: "0001_first.sql", sql: "first" },
];

describe("migration runner", () => {
  it("locks before reading the ledger and applies files in order, once", async () => {
    const db = fake();
    await applyMigrations(db.client, files);
    expect(db.events[0]).toContain("pg_advisory_lock");
    expect(db.events.indexOf("first")).toBeLessThan(db.events.indexOf("second"));
    expect(db.events.filter((event) => event === "COMMIT")).toHaveLength(2);
    expect(db.events.at(-1)).toContain("pg_advisory_unlock");
    db.events.length = 0;
    await applyMigrations(db.client, files);
    expect(db.events).not.toContain("first");
    expect(db.events).not.toContain("second");
  });

  it("rejects changed checksums before applying pending files", async () => {
    const db = fake();
    await applyMigrations(db.client, [files[1]]);
    db.events.length = 0;
    await expect(
      applyMigrations(db.client, [{ ...files[1], sql: "changed" }, files[0]]),
    ).rejects.toThrow("checksum");
    expect(db.events).not.toContain("second");
    expect(db.events.at(-1)).toContain("pg_advisory_unlock");
  });

  it("refuses missing applied files and older pending files", async () => {
    const db = fake();
    await applyMigrations(db.client, [files[0]]);
    await expect(applyMigrations(db.client, [files[1]])).rejects.toThrow("missing");
    await expect(applyMigrations(db.client, files)).rejects.toThrow("forward");
  });

  it("rolls back failed SQL without recording it and releases the lock", async () => {
    const db = fake([], true);
    await expect(
      applyMigrations(db.client, [{ version: "0001_broken.sql", sql: "broken" }]),
    ).rejects.toThrow("SQL failed");
    expect(db.applied).toEqual([]);
    expect(db.events).toContain("ROLLBACK");
    expect(db.events.at(-1)).toContain("pg_advisory_unlock");
  });
});
