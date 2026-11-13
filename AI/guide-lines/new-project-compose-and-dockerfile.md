---
name: new-project-compose-and-dockerfile
description: Copyable Dockerfile and Compose examples for a new project that deploys production on Atlas and homolog on an isolated VM.
type: reference
area: guide-lines
---

# New project: Dockerfile and Compose examples

Start with [the roadmap](new-project-roadmap.md). Read this note in phase 4.
The examples come from `lvgs-dev/server-supply`. Replace `<PROJECT>` and `<PORT>` with your values. Project-owned `deploy/project.json` declares services, ports, health, database and migrations. `deploy/env-manifest.json` declares all application variables and secrets. Example application names are not engine requirements. Optional values use `required:false` because GitHub cannot store empty secrets.

## Select a scaffold

Use `static-site` for a built frontend with Caddy, port 8080 and no database.
Use `python-service` for the existing Python API kit with PostgreSQL, Alembic and port 8000.
Use `node-service` for a pnpm workspace with `apps/web`, `apps/api`, PostgreSQL and port 8000.
Select it with `lvgs --ci-workflow --kind node-service`.
The examples below describe the Python kit. Node has no separate migrate service.

## Node service runtime contract

The Node scaffold supplies delivery files for an existing application, not a new workspace.
Pin pnpm and commit `pnpm-lock.yaml`. Both workspace packages must have a `build` script.
The web build writes `apps/web/dist`. The API build writes `apps/api/dist/index.js` and `dist/migrate.js`.
The API package depends on `pg`. Its package files must include `dist` and migration assets for `pnpm deploy`.
The image copies the API production package to `/app` and the web build to `/app/public`.
The API serves that directory and binds to `HOST=0.0.0.0` and `PORT=8000`.

`deploy/start.cjs` holds advisory lock `74201901` on a dedicated PostgreSQL connection.
`dist/migrate.js` exports an async CommonJS function that takes that connected `pg` client.
It applies migrations through that client only; it must not create a separate connection.
Startup awaits it, closes the lock connection, then loads `dist/index.js`.
A failed migration stops startup. The migration script applies only missing revisions.
Startup and API code read `/run/secrets/db_password` and use `PGHOST`, `PGUSER` and `PGDATABASE`.
Call the supplied CommonJS `require('../health.cjs')` handler from the compiled API before other routes.
For example: `if (health(req, res)) return;` inside the HTTP request handler.
It serves `GET /api/health` with `{status: "ok", revision: process.env.APP_REVISION || "unknown"}`.
Compose supplies `APP_REVISION` from `EXPECTED_REVISION` at runtime. Never bake the revision into the image.
The engine smoke test runs `node dist/index.js` with `APP_SMOKE_TEST=true`, without PostgreSQL or mounted secrets.
The API must skip database initialization in that explicit smoke mode and still expose its real health route.
This checks the built API and runtime image. It does not exercise database integration or migrations.

PostgreSQL 17 uses a named volume. Only the application joins `edge`; the database stays internal.
Production selects the application image by digest and reads secrets from the environment's files.
The engine has no generic migration kind. It accepts only `none` or `alembic`.
Node therefore uses `migrate.kind: none` and migrates at API start under the advisory lock.
Use forward only migrations and expand/contract changes so the previous image can use the new schema.
A generic `command` migration kind in `ci-workflows` is a pending improvement.

## How the files fit together

| File                  | Used by                   | Purpose                                                                 |
| --------------------- | ------------------------- | ----------------------------------------------------------------------- |
| `Dockerfile`          | CI and developers         | Builds the one image that every environment runs.                       |
| `compose.yaml`        | Developers                | Builds the image on the machine. Starts the database and the migration. |
| `compose.prod.yaml`   | Production and homolog    | Runs an image by digest. Never builds.                                  |
| `compose.edge.yaml`   | Homolog and production    | Joins the shared `edge` network and pins the secrets folder.            |
| `compose.lan-db.yaml` | Production only, optional | Publishes the database on the local network.                            |

Both environments list `compose.yaml` first, then `compose.prod.yaml`, then `compose.edge.yaml` last (production may add `compose.lan-db.yaml` before `compose.prod.yaml`).
The later file overrides the earlier one.

## Rules for every Compose file

- Never put a secret value in a Compose file. Use `secrets:` with `file:` and read `/run/secrets/<name>`.
- Never publish a port on `0.0.0.0`. Bind to `127.0.0.1:<PORT>`. The tunnel is the public path.
- Never set `container_name`. Compose builds a unique name from the project name.
- Never run the app as root. The image sets a non-root user.
- Keep the image identical in every environment. Only settings and secrets change.
- Name the project with `name: ${COMPOSE_PROJECT_NAME:-<PROJECT>}`. Each environment gets its own project name.

## Dockerfile skeleton

```dockerfile
# syntax=docker/dockerfile:1.7
# Pin every FROM by digest and build with --pull=always. Get a digest with: docker buildx imagetools inspect <image:tag>
# Stage 1: build the frontend. The registry token comes from a BuildKit secret and never stays in a layer.
FROM node:24-trixie-slim@sha256:<digest> AS web
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml frontend/.npmrc ./
RUN --mount=type=secret,id=github_token,required=true \
    set -e; \
    printf '//npm.pkg.github.com/:_authToken=%s\n' "$(cat /run/secrets/github_token)" > /tmp/npmrc; \
    NPM_CONFIG_USERCONFIG=/tmp/npmrc pnpm install --frozen-lockfile; \
    rm -f /tmp/npmrc
COPY frontend/ ./
RUN pnpm build

# Stage 2: install the Python dependencies in a virtual environment.
FROM python:3.14-slim-trixie@sha256:<digest> AS pydeps
COPY backend/pyproject.toml /srv/backend/pyproject.toml
RUN python -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir /srv/backend

# Stage 3: the runtime image. It holds no build tools and no tokens.
FROM python:3.14-slim-trixie@sha256:<digest>
RUN useradd --system --uid 10001 --create-home app
COPY --from=pydeps /opt/venv /opt/venv
COPY backend/ /srv/backend/
COPY --from=web /app/frontend/dist /srv/frontend/dist
ENV PATH="/opt/venv/bin:$PATH"
WORKDIR /srv/backend
USER app
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4).status == 200 else 1)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Notes:

- Drop stage 1 if the project has no private npm package or no frontend.
- Keep the temporary `.npmrc` outside the source folder. Delete it in the same `RUN` step.
- Add `pnpm-workspace.yaml` with `minimumReleaseAgeExclude: ['@lvgs-dev/ui']` only if pnpm blocks your own new package.
- Podman drops the `HEALTHCHECK` unless you build with `--format docker`. The CI job does this.

## compose.yaml (development)

```yaml
name: <PROJECT>

services:
  app:
    build:
      context: .
      secrets: [github_token]
    image: <PROJECT>:latest
    restart: unless-stopped
    depends_on:
      db: { condition: service_healthy }
      migrate: { condition: service_completed_successfully }
    environment:
      DATABASE_URL: ${DATABASE_URL:-postgresql+psycopg://app@db:5432/app}
    secrets: [db_password]
    ports: ["127.0.0.1:<PORT>:8000"]
    networks: [internal]

  migrate:
    build: { context: ., secrets: [github_token] }
    image: <PROJECT>:latest
    restart: "no"
    command: ["python", "-m", "app.migrate"]
    depends_on:
      db: { condition: service_healthy }
    environment:
      DATABASE_URL: ${DATABASE_URL:-postgresql+psycopg://app@db:5432/app}
    secrets: [db_password]
    networks: [internal]

  db:
    image: postgres:17-trixie
    restart: unless-stopped
    environment:
      POSTGRES_USER: app
      POSTGRES_DB: app
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets: [db_password]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 10s
      timeout: 5s
      retries: 6
      start_period: 20s
    networks: [internal] # no published port

networks:
  internal: {}

volumes:
  pgdata: {}

secrets:
  db_password:
    file: ${SECRETS_DIR:-./secrets}/db_password
  github_token:
    file: ${SECRETS_DIR:-./secrets}/github_token
```

## compose.prod.yaml (production and homolog)

```yaml
name: ${COMPOSE_PROJECT_NAME:-<PROJECT>}

services:
  app:
    image: ${IMAGE_REF:?set IMAGE_REF to ghcr.io/lvgs-dev/<PROJECT>@sha256:<digest>}
    build: !reset null # production never builds
    pull_policy: never # the deploy script pulls the digest first
    restart: unless-stopped
    depends_on: !override # the migration runs from the deploy script, not from Compose
      db: { condition: service_healthy }
    ports: !override
      - "127.0.0.1:${APP_HOST_PORT:-<PORT>}:8000"
    healthcheck:
      test:
        [
          "CMD",
          "python",
          "-c",
          "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4).status == 200 else 1)",
        ]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s

  migrate:
    profiles: ["migrate"] # started only by the deploy script
    build: !reset null
    image: ${IMAGE_REF:?set IMAGE_REF}
    pull_policy: never
    restart: "no"
    command: ["python", "-m", "app.migrate"]
    depends_on:
      db: { condition: service_healthy }
```

Keep the rest of the services (`db`) from `compose.yaml`.
Add every setting the app needs under `environment:` with `${NAME:?message}` for required values.

## compose.edge.yaml (homolog and production)

```yaml
# Joins the shared external network so the tunnel container can reach the app by a unique name.
services:
  app:
    networks:
      internal: {}
      edge:
        aliases:
          - ${APP_ALIAS:?set APP_ALIAS}
networks:
  edge:
    external: true
    name: ${EDGE_NETWORK:-edge}
# Required here so a manual run cannot mount the production secrets by mistake.
secrets:
  db_password:
    file: ${SECRETS_DIR:?set SECRETS_DIR to the secrets directory of this environment}/db_password
```

Only `app` joins `edge`. The database stays on `internal`. Warning: Compose also gives the service name as an alias on `edge`, so two environments on `edge` share it. The tunnel must route to the unique container name.
See [the traps note](ci-cd-traps.md), trap 5.

## .env.example

```dotenv
# Names only. The deploy job writes the real file from the GitHub Environment.
TIMEZONE=America/Sao_Paulo
LOG_LEVEL=info
APP_HOST_PORT=<PORT>
```

Keep secrets out of this file. Declare each secret name and destination in `deploy/env-manifest.json`. Keep source instructions in the project runbook under `AI/`.

## Files written on the server

The ci-workflows engine's `render-env.sh` writes these files for each environment, from environment variables:

| Path                                     | Mode | Content                                                                               |
| ---------------------------------------- | ---- | ------------------------------------------------------------------------------------- |
| `<state folder>/env/`                    | 700  | The folder. Only the runner user enters it.                                           |
| `<state folder>/env/.env`                | 600  | Settings and any manifest-declared environment secrets. Compose reads it on the host. |
| `<state folder>/env/secrets/`            | 700  | The secrets folder.                                                                   |
| `<state folder>/env/secrets/db_password` | 644  | The database password.                                                                |

The secret files are 644 because the containers run as a non-root user.
The 700 folder keeps other host users out. The Docker daemon runs as root and can mount the file.

## Related

- [New project roadmap](new-project-roadmap.md): The ordered phases.
- [Workflow and scripts](new-project-workflow-and-scripts.md): The jobs that use these files.
- [CI and CD traps](ci-cd-traps.md): Failures linked to these files.
