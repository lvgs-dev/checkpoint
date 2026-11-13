---
name: authorization
description: Authentication, permission and ownership rules of the API.
type: reference
area: backend
---

# Authorization

Three separate questions: who is calling (authentication), may this role do this action (permission), may this caller touch this record (ownership).

- **Authentication**: `apps/api/src/auth/auth.ts` resolves an opaque cookie session in PostgreSQL. Only the token hash enters storage.
- **Permission**: `packages/core/src/authorization.ts` defines roles (`admin`, `user`) and permissions. Each session lookup reads the database role.
- **Ownership**: repositories filter by the owner id. Someone else's record answers 404, never 403.
- Only `admin` can edit the shared catalog (`game` rows). One exception: the user who creates a shared row by Steam import can fill its catalog fields (`apps/api/src/data/repositories/games.ts`, creator flag).
- `apps/api/db/migrations/0100_auth.sql` defines identities, provider links, sessions, email tokens, and temporary OAuth state.
- `app_user.auth_identity_id` preserves the explicit identity mapping. Email text never grants access to an existing owner.
- Passwords use scrypt because Argon2 is absent. Parameters: N=32768, r=8, p=1, 16-byte salt, 64-byte key, 64 MiB maximum memory.
- Sessions expire after 30 days. Login rotates the current session. Recovery revokes every session and pending token for that identity.
- Verification and recovery tokens expire after one hour. Consumption and credential updates share one database transaction.
- Cookies use HttpOnly and SameSite=Lax. HTTPS enables Secure. Production requires HTTPS through `AUTH_ORIGIN`.
- Browser writes require an exact Origin match. Dedicated-token release registration keeps its separate authentication boundary.
- Login limits apply by account and socket address. Limits are process-local. Forwarded headers never determine the client address.
- SMTP uses implicit TLS on port 465 by default. Development console delivery logs metadata without tokens or links.
- GitHub login requires `AUTH_GITHUB_ENABLED=true`. OAuth uses state, PKCE, and an explicit provider subject mapping.
- New GitHub accounts have no email. Provider email never links an existing password account.
- The web client stores public identity data in memory. Recovery links carry their token in a fragment, which the client removes immediately.

## Add a permission

1. Add the name to `Permission` in `packages/core/src/authorization.ts` and grant it to the right roles.
2. Wire it in the central gate in `apps/api/src/main/server.ts`. GET, HEAD, and tracking need `games:read`.
   Writes under `/settings/` need `settings:update`. Other protected writes need `games:update`. Telemetry precedes this permission gate.
3. Hide UI the caller cannot use for convenience only; the server stays the authority.

## Related

- [[AI/backend/backend]]: Request flow of apps/api and the map of backend notes.
- [[AI/backend/extending-classes]]: Steps to add a repository, service method, route, permission or log sink.
- [[AI/backend/infrastructure]]: Hosting, storage modes, environment variables and scripts of the API.
- [[AI/backend/security]]: API security boundaries and isolated security tests.
