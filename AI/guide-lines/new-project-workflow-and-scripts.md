---
name: new-project-workflow-and-scripts
description: What the project kit owns, how ci.yml calls the shared engine, and how to check a delivery.
type: reference
area: guide-lines
---

# New project: workflow, scripts, and checks

Start with [the roadmap](new-project-roadmap.md). Read this note in phases 5 to 12.
`scripts/start-project-standard.sh` copies `templates/project/`. The project owns its Dockerfile,
Compose files, Makefile, `.env.example`, environment manifest, contract, rulesets, and delivery tests.
The publish and deploy engine lives in `lvgs-dev/ci-workflows`. Do not copy its scripts or tests into a project.

## What the template fixes and what you replace

`lvgs-bootstrap init` writes `deploy/project.json` from the project answers. The service name equals
the project name. The default container port is 8000 and the health path is `/api/health`.
The supplied Compose profile uses PostgreSQL with user and database `app`, and Alembic migrations.
Choose `none` or `postgres` for the database and `none` or `alembic` for migrations.
Keep the Dockerfile and Compose configuration consistent with those answers.
For custom answers, bootstrap pauses for that adaptation before running the contract smoke check.
Review the Compose golden test when the stack changes.

Fill the Make targets `install`, `typecheck`, `test`, and `build`. Replace the example application
settings in `deploy/env-manifest.json`, the Compose files, and the project's `.env.example` together.
`APP_REQUIRED_SETTING` and `app_secret_key` are application examples, not engine requirements.
Declare optional values with `required:false`. GitHub cannot store empty secrets.
The kit currently lacks `.env.example`; create the names-only file in the project.
Keep project tests for the Compose render golden, rulesets, and manifest. Run `bash deploy/tests/run.sh`.
Library mode copies no project contract, image configuration, or deploy engine.

## One workflow file

`.github/workflows/ci.yml` contains three PR check jobs and thin calls to the shared engine.
The image job uses `lvgs-dev/ci-workflows/actions/image-check`. Publish and deploy use the reusable
`publish.yml` and `deploy.yml` workflows with `secrets: inherit`.
Publish runs after all three checks, on pushes to `main` and `homolog` only.
Deploy receives the publish digest and selects the branch's environment.
Do not add a second workflow that starts with `workflow_run`.

Both bootstrap entry points accept `--ci-workflows-ref <40-hex release SHA>` and fill `__CIW_REF__`.
The default comes from `ci_workflows_ref` in the target's `bootstrap.json`.
Record the newest released engine SHA there. A missing ref stops project setup.
Use `--allow-ref-name` with a named ref only for testing. The guided bootstrap records that exception
in its state. `verify` accepts that recorded named ref with a WARN. Production uses a release SHA.

## Jobs

| Job id | Required check name | Purpose |
| --- | --- | --- |
| `tests` | `Tests (Oreon)` | Run project tests and project delivery tests. |
| `typecheck-build` | `Typecheck and build (Oreon)` | Check types and build the application. |
| `image` | `Image build and smoke test (Oreon)` | Call the shared image-check action. |

Keep these check names aligned with the rulesets. Generate changes with `scripts/generate-rulesets.py`.
Fork and Dependabot PRs receive no package secrets. The test job rejects their promotion until the
owner supplies a reviewed same-repository branch. Publish and deploy never run from a PR.
The shared workflows own runner selection, deployment concurrency, and the publish steps.

## Tags in GHCR

The shared engine builds once on `homolog`. On `main`, it promotes the tested image for the same Git
tree. It retags the manifest in the registry as `<sha>` and `approved-<sha>`, without rebuilding or repushing the image. The digest stays identical. Homolog publishes `<sha>`, `approved-homolog-<sha>`, `homolog`, and `tree-<tree>`. The engine checks approval tags and passes the digest to deploy. A production tree without a
tested homolog image fails closed. Projects call this behavior through the pinned reusable workflows.

## The deploy job, step by step

The shared deploy workflow reads `deploy/project.json` and `deploy/env-manifest.json` from the project.
It pulls the digest, renders settings, runs the configured database and migration steps, starts the
application, and checks health. It verifies the running image digest. An optional health revision field
adds a revision check. Automatic rollback restores the recorded previous digest or image ID when application rollout fails. It does not reverse migrations. The public endpoint check accepts HTTP 200 or an Access login redirect; it does not prove the revision by itself.
The shared repository owns the fake Docker, registry, and Cloudflare engine tests.
The owner must allow `lvgs-dev/ci-workflows/.github/workflows/deploy.yml@<40-hex release SHA>`
in the `deploy` runner group. The project caller alone does not authorize the reusable workflow.

## Environment values

Use [environments and secrets](environments-and-secrets.md) for the names and scopes.
Each environment has its own values and credentials. Keep Cloudflare route creation outside CI.
The production caller pins the host port through `app-host-port`; homolog reads its Environment port.

## Switches

The repository variable `DEPLOY_HOMOLOG` enables the homolog deploy when its value is exactly `true`.
The bootstrap sets it from the project answer. Switching it off skips the deploy job and leaves publish
running, so promotion still has a tested image. The switch does not stop existing containers or start
a deployment by itself. Only the owner changes it.

## Scripts

The project keeps `scripts/apply-branch-rulesets.sh` and `scripts/generate-rulesets.py`.
Shared image, publish, deploy, rollback, and Cloudflare scripts belong to `ci-workflows`.
Use the pinned engine version's tools and documentation for owner operations.

## Tests

Run `bash deploy/tests/run.sh` in the project. It checks the Compose render golden, rulesets, and
manifest. Run engine tests in `ci-workflows`, not in an instantiated project.
Subharness checks the complete copy boundary with `bash scripts/tests/test-template-kit.sh`.

## How to prove a deploy

1. Confirm that all jobs pass and the running app uses the published digest.
2. Check the contract health path on loopback and the public hostname after Access login.
3. If configured, check the database migration revision and the expected health revision field.
4. For production, confirm that the database container kept its data and was not recreated.
5. Record the deployed digest and the previous digest for rollback in the project runbook.

## Related

- [New project roadmap](new-project-roadmap.md): Follow the delivery phases.
- [Compose and Dockerfile examples](new-project-compose-and-dockerfile.md): Configure project-owned files.
- [CI and CD traps](ci-cd-traps.md): Avoid known delivery failures.
- [Security and access](new-project-security-and-access.md): Set identities and permissions.
- [CI and CD standard](ci-cd.md): Apply the delivery rules.
