---
name: database-checklist
description: Steps to create a database table with indexes, audit columns, and access controls.
type: how-to
area: backend
---

# How to create a database table

1. Understand the domain before you design the table.
2. Read actual queries for filters, sort columns, joins, and foreign keys.
3. Ask the owner when query needs are unclear. Do not guess.
4. Define a primary key and the required foreign keys.
5. Create the table and its required indexes in the same migration.
6. Check existing primary key and unique indexes before you add another index.
7. Put equality filters first in composite indexes. Follow them with the query's sort columns.
8. Index foreign key columns used by joins or reference checks. Add `*_by` indexes only for actual queries.
9. Add status indexes only when actual queries need them.
10. Use full names in `snake_case`. Name indexes `<table>_<columns>_idx` and unique indexes `<table>_<columns>_uq`.
11. Add these audit columns with their full names:
    - `created_at`: `timestamptz NOT NULL DEFAULT now()`.
    - `updated_at`: `timestamptz NOT NULL DEFAULT now()`.
    - `deleted_at`: nullable `timestamptz`, default `NULL`.
    - `created_by`: nullable `uuid` referencing `app_user(id)`, no default; the application sets the actor on insert.
    - `updated_by`: nullable `uuid` referencing `app_user(id)`, no default; the application sets the actor on each update.
    - `deleted_by`: nullable `uuid` referencing `app_user(id)`, default `NULL`.
12. Keep actor columns nullable without defaults. Never backfill actor identifiers.
13. Reuse existing timestamp handlers. Otherwise, attach `trg_touch_updated_at()` as a `BEFORE UPDATE` row trigger.
14. Use `deleted_at` and `deleted_by` for soft deletion. The application sets both when it marks a row deleted.
15. Enforce ownership in API queries. Do not add RLS without a request-scoped database identity.
16. Add the next ordered SQL file to apps/api/db/migrations. Reserve 0100_auth.sql for local authentication.
17. Let the runner supply the transaction. Do not add BEGIN, COMMIT, or ledger writes inside migration files.
    Use SET LOCAL for transaction settings. Never edit an applied file.
18. Validate the migration on local Postgres. Run it twice when it claims idempotence.
19. Run `pnpm check` from the repository root and confirm exit code `0`.

Existing tables receive missing audit columns through `0021_audit_columns.sql`.
New timestamp defaults record migration time for existing rows. They do not reconstruct historical dates.
The migration preserves `app_release.created_by` as `text` for release script compatibility.
Release tables remain append-only; their existing triggers reject updates and deletions.

## Related

- [[AI/backend/backend]]: Request flow of apps/api and the map of backend notes.
- [[AI/backend/infrastructure]]: Hosting, storage modes, environment variables and scripts of the API.
