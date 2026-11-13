import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

export interface MigrationClient {
  query(sql: string, parameters?: string[]): Promise<{ version: string; checksum: string }[]>;
  transaction(run: (client: MigrationClient) => Promise<void>): Promise<void>;
}

interface Migration {
  version: string;
  sql: string;
}

const folder = fileURLToPath(new URL("../../db/migrations/", import.meta.url));
const LOCK = 724916031;

/** Apply an immutable, forward-only history on one reserved connection. */
export async function applyMigrations(client: MigrationClient, files: Migration[]): Promise<void> {
  await client.query(`SELECT pg_advisory_lock(${LOCK})`);
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migration (
      version text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const applied = await client.query(
      "SELECT version, checksum FROM public.schema_migration ORDER BY version",
    );
    const ordered = [...files].sort((a, b) => a.version.localeCompare(b.version));
    const checksums = new Map(
      ordered.map((file) => [file.version, createHash("sha256").update(file.sql).digest("hex")]),
    );
    if (checksums.size !== files.length) throw new Error("Duplicate migration version");
    for (const row of applied) {
      if (!checksums.has(row.version)) throw new Error(`Applied migration missing: ${row.version}`);
      if (checksums.get(row.version) !== row.checksum)
        throw new Error(`Migration checksum changed: ${row.version}`);
    }
    const known = new Set(applied.map((row) => row.version));
    const latest = applied
      .map((row) => row.version)
      .sort()
      .at(-1);
    const pending = ordered.filter((file) => !known.has(file.version));
    if (latest && pending.some((file) => file.version <= latest))
      throw new Error("Migrations must move forward");
    for (const file of pending) {
      await client.transaction(async (tx) => {
        await tx.query(file.sql);
        await tx.query("INSERT INTO public.schema_migration (version, checksum) VALUES ($1, $2)", [
          file.version,
          checksums.get(file.version)!,
        ]);
      });
    }
  } finally {
    await client.query(`SELECT pg_advisory_unlock(${LOCK})`);
  }
}

export async function migrate(url = process.env.DATABASE_URL): Promise<void> {
  if (!url) throw new Error("DATABASE_URL is required for migrations");
  const files = await Promise.all(
    (await readdir(folder))
      .filter((name) => name.endsWith(".sql"))
      .map(async (version) => ({
        version,
        sql: await readFile(resolve(folder, version), "utf8"),
      })),
  );
  const pool = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
  try {
    const connection = await pool.reserve();
    try {
      const client: MigrationClient = {
        async query(sql, parameters = []) {
          return [
            ...(await connection.unsafe<{ version: string; checksum: string }[]>(sql, parameters)),
          ];
        },
        async transaction(run) {
          await connection.unsafe("BEGIN");
          try {
            await run(client);
            await connection.unsafe("COMMIT");
          } catch (error) {
            await connection.unsafe("ROLLBACK");
            throw error;
          }
        },
      };
      await applyMigrations(client, files);
    } finally {
      connection.release();
    }
  } finally {
    await pool.end({ timeout: 5 });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await migrate();
}
