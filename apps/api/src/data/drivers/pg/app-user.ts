// Application owners link to local authentication identities.
import type { Sql } from "../../db.ts";
import type { AppUserDriver } from "../types.ts";

export class PgAppUserDriver implements AppUserDriver {
  private sql: Sql;
  constructor(sql: Sql) {
    this.sql = sql;
  }
  async findByAuthId(authId: string) {
    const [found] = await this.sql<{ id: string }[]>`
      SELECT id FROM app_user WHERE auth_identity_id = ${authId}`;
    return found?.id;
  }
  async create(authId: string, email: string | null) {
    const [created] = await this.sql<{ id: string }[]>`
      INSERT INTO app_user (id, auth_identity_id, email)
      VALUES (${authId}, ${authId},
              CASE WHEN NOT EXISTS (SELECT 1 FROM app_user WHERE lower(email) = lower(${email}))
                   THEN ${email}::text END)
      ON CONFLICT (id) DO UPDATE SET auth_identity_id = EXCLUDED.auth_identity_id
        WHERE app_user.auth_identity_id IS NULL OR app_user.auth_identity_id = EXCLUDED.auth_identity_id
      RETURNING id`;
    return created?.id;
  }
}
