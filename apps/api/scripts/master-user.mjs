// Provision an administrator and copy seed entries without writing credentials.
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { hashPassword } from "../src/auth/password.ts";
import { readSecret } from "../src/shared/secret.ts";

const env = process.env;
const masterPassword = readSecret("MASTER_PASSWORD", env);
for (const key of ["DATABASE_URL", "MASTER_EMAIL"]) {
  if (!env[key]) throw new Error(`Set ${key}`);
}
if (!masterPassword) throw new Error("Set MASTER_PASSWORD or MASTER_PASSWORD_FILE");
if (masterPassword.length < 8 || Buffer.byteLength(masterPassword) > 1024)
  throw new Error("MASTER_PASSWORD must contain 8 to 1024 bytes");
const email = env.MASTER_EMAIL.trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid MASTER_EMAIL");
const passwordHash = await hashPassword(masterPassword);
const seedId = "00000000-0000-4000-8000-000000000001";
const reset = process.argv.includes("--reset");
const sql = postgres(env.DATABASE_URL, { prepare: false, max: 1 });
try {
  await sql.begin(async (tx) => {
    const [identity] = await tx`
      INSERT INTO auth_identity (id, email, email_verified, password_hash, role)
      VALUES (${randomUUID()}, ${email}, true, ${passwordHash}, 'admin')
      ON CONFLICT (email) DO UPDATE
        SET email_verified = true, password_hash = EXCLUDED.password_hash, role = 'admin'
      RETURNING id`;
    await tx`UPDATE auth_session SET revoked_at = now() WHERE identity_id = ${identity.id} AND revoked_at IS NULL`;
    await tx`UPDATE auth_token SET used_at = now() WHERE identity_id = ${identity.id} AND used_at IS NULL`;
    const [owner] = await tx`
      INSERT INTO app_user (id, auth_identity_id, email, display_name)
      VALUES (${identity.id}, ${identity.id}, ${email}, 'master')
      ON CONFLICT (auth_identity_id) DO UPDATE SET auth_identity_id = EXCLUDED.auth_identity_id
      RETURNING id`;
    if (reset) {
      await tx`DELETE FROM game_list WHERE user_id = ${owner.id}`;
      await tx`DELETE FROM library_entry WHERE user_id = ${owner.id}`;
    }
    await tx`
      INSERT INTO library_entry (user_id, game_id, status, desire, store_id, platform, actual_hours,
                                 started_at, finished_at, rating, notes, steam_hours,
                                 steam_updated_at, imported)
      SELECT ${owner.id}, e.game_id, e.status, e.desire, e.store_id, e.platform, e.actual_hours,
             e.started_at, e.finished_at, e.rating, e.notes, e.steam_hours, e.steam_updated_at,
             e.imported
        FROM library_entry e
       WHERE e.user_id = ${seedId}
         AND NOT EXISTS (SELECT 1 FROM library_entry m
                          WHERE m.user_id = ${owner.id} AND m.game_id = e.game_id)`;
  });
  console.info("Administrator provisioned. Existing sessions and recovery tokens are revoked.");
} finally {
  await sql.end();
}
