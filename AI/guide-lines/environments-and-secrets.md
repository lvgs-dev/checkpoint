---
name: environments-and-secrets
description: The one table of GitHub Environment variables and secrets, the homolog side-effect rule and the bootstrap order. Names only, never values.
type: how-to
area: guide-lines
---

# Environments and secrets

Start with [AGENTS.md](../../AGENTS.md). Read this file when you bootstrap a project or change its deploy settings.
This file lists platform names and scopes. Each project declares all its own variables and secrets in `deploy/env-manifest.json`. Other notes link here. The pipeline that reads the values is in [CI and CD](ci-cd.md).

## Rules

1. Create two GitHub Environments: `homolog` and `production`.
2. Lock each Environment to one branch: `homolog` to `homolog`, `production` to `main`. An Environment with no branch policy lets any branch read its secrets.
3. Put deploy values on the Environment. Repository level holds only the switch `DEPLOY_HOMOLOG`.
4. Never store a value in Git, in a workflow, in a template or in a document.
5. Homolog and production never share a database, volume, port, hostname or credential. Never copy production data to homolog.
6. Cloudflare credentials stay outside GitHub. The owner creates the routes (see [roadmap](new-project-roadmap.md) phase 9).
7. No external secrets manager now. Record Infisical as the future option with a decision note.

## Names

| Name                                             | Kind             | Scope       | Purpose                                                                                                         |
| ------------------------------------------------ | ---------------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| `DEPLOY_HOMOLOG`                                 | variable         | repository  | `true` or `false`. Switches the homolog deploy job.                                                             |
| `PUBLIC_HOSTNAME`                                | variable         | Environment | Public name of the environment.                                                                                 |
| `APP_HOST_PORT`                                  | variable         | Environment | Loopback host port. In `production` the job pins it as a literal.                                               |
| `COMPOSE_PROJECT_NAME`                           | variable         | Environment | Unique project name. The engine derives it from the project and environment.                                    |
| `APP_ALIAS`                                      | variable         | Environment | Network alias on `edge`. The engine derives it from the project and environment.                                |
| `TIMEZONE`, `LOG_LEVEL`                          | variable         | Environment | Runtime settings.                                                                                               |
| `HOMOLOG_SAFE_MODE`                              | variable         | Environment | Only for a project with external side effects. `true` in `homolog`, `false` in `production`. Switches them off. |
| Project settings                                 | variable         | Environment | Non-secret settings declared by the project.                                                                    |
| `DB_PASSWORD`                                    | secret           | Environment | Database password. A different value per Environment.                                                           |
| Project secrets                                  | secret           | Environment | Mounted as files at `/run/secrets/<lowercase name>`. A different value per Environment.                         |
| `CF_HEALTH_CLIENT_ID`, `CF_HEALTH_CLIENT_SECRET` | secret, optional | Environment | Read-only Access service token for the external health check.                                                   |

1. The engine loads declared names from `deploy/env-manifest.json`. `render-env.sh` writes them and preflight checks required entries. `APP_REQUIRED_SETTING`, `APP_SECRET_KEY` and `app_secret_key` are application examples, not engine requirements. Replace examples in the manifest, Compose and app together.
2. GitHub Packages and GHCR use `GITHUB_TOKEN`. There is no repository secret and no personal access token.
3. Add a row here before you add a platform name. No other note keeps a second table.
4. Never put a single quote in a value. GitHub cannot store empty secrets. Set `required:false` for optional variables and secrets. Leave an absent optional secret unset. `allow_empty:true` is for variables only and means optional. Never use it on a secret and never combine it with `required:true`; the engine validator rejects both.
5. To change a value, edit the Environment and re-run the deploy job.
6. A GitHub secret is not visible after you create it. Keep a private copy in the password manager.

## Homolog never causes a production side effect

1. At phase 0, list every external side effect: device polling, e-mail, SMS, webhooks, queues, payments, third-party APIs.
2. Put each behind a flag that is off or in sandbox mode when `HOMOLOG_SAFE_MODE=true`.
3. Homolog never shares a device, a third-party key or a customer-facing sender with production.
4. An exception needs a decision note that names the shared target and the owner. Example: `server-supply` homolog may poll the same Tuya device as production while homolog is off by default.

## Bootstrap order

The low-level `start-project-standard.sh` command is a dry run until you add `--execute`. The guided `lvgs-bootstrap init|resume` executes steps and pauses at owner gates. Use `status`, `verify`, and `doctor` to inspect progress. State is in `.git/lvgs-bootstrap-state.json`. Stop at the first failed step. The bootstrap still generates missing optional secrets, and `verify` still expects every manifest name. Resolve those gaps before treating optional-value verification as complete.

1. Create the repository and push `main`.
2. Copy the templates: `scripts/start-project-standard.sh --target <DIR> --owner <O> --repo <R> --ci-workflows-ref <40-hex release SHA>`.
3. Set the repository settings and create `homolog` and the Environments.
4. Lock the branch policy of each Environment and read it back with `gh api`.
5. Set the variables and secrets of the table on `homolog`, then on `production`.
6. Open a PR into `homolog`. Wait for the required checks.
7. Confirm that the `homolog` push run pushed `approved-homolog-<sha>`.
8. Apply the rulesets, see [branch protection](branch-protection.md).

## Related

- [CI and CD](ci-cd.md): The pipeline that reads these values.
- [Branch protection](branch-protection.md): Ruleset order and checks.
- [Security and access](new-project-security-and-access.md): Files and modes on the host.
