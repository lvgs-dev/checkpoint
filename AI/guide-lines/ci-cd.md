---
name: ci-cd
description: Normative rules of the one CI, publish and deploy pipeline (single ci.yml). Read it when you change workflows, images or deploy scripts.
type: reference
area: guide-lines
---

# CI and CD

Start with [AGENTS.md](../../AGENTS.md). Read this file for every task that changes workflows, the Dockerfile, deploy scripts or the image contract.
The step-by-step build is in [the roadmap](new-project-roadmap.md). The jobs, tags and scripts are in [workflow and scripts](new-project-workflow-and-scripts.md). This file keeps only the rules.
For setup, run `lvgs-bootstrap scaffold <kind>`, read only the generated checklist; do not read the engine repository or sample projects.
The command creates project files and pins engine calls to a release commit SHA.
Add `--homolog` to generate a homolog deploy job. Publishing on `homolog` still supplies the promotion image.
The reference project is `lvgs-dev/server-supply`.
To start a new Atlas project with one guided command, use [the lvgs command](lvgs-command.md).

## One pipeline

1. Project check jobs and reusable workflow calls live in `.github/workflows/ci.yml`. The engine owns publish and deploy jobs. Projects keep `deploy/project.json` and `deploy/env-manifest.json`, never engine scripts. No second workflow starts with `workflow_run`. GitHub reads such a workflow only from the default branch.
2. Pull requests run the check jobs. A push to `homolog` or `main` also runs `publish` and the deploy job of that branch.
3. Build once on `homolog`. `main` never rebuilds. It retags the tested manifest of the same Git tree in the registry. No image repush occurs. The digest stays identical.
4. Deploy by digest only. Never deploy a mutable tag.
5. A merge made with the App token of the bot starts the `push` run. A merge made with `GITHUB_TOKEN` does not.

## Runners

1. Check and publish jobs run on `oreon` (`self-hosted, linux, x64, oreon`). Build with `podman build --format docker --pull=always` so `HEALTHCHECK` stays and base layers are fresh.
2. The production deploy job runs on `atlas-deploy`. The runner group `deploy` must allow `lvgs-dev/ci-workflows/.github/workflows/deploy.yml@<40-hex release SHA>` under Selected workflows. The homolog deploy job runs on `homolog-deploy`, a VM on Oreon with its own runner group (see [homolog VM](homolog-vm.md) and [security and access](new-project-security-and-access.md)).
3. A job that is reachable from a pull request never uses `runs-on: atlas-deploy`.
4. Pin project actions and reusable workflows to full commit SHAs. The engine pin must resolve to a release tag. Production never follows a branch. The engine release script pins its internal actions to that release tag. Set the minimum `permissions` and a `concurrency` group.

## Required checks

1. The names of the required checks are the `name:` of the PR jobs in `ci.yml`. The names are not fixed. Each project picks them once.
2. `scripts/generate-rulesets.py --write` copies the names into the ruleset JSON. `--check` runs in `deploy/tests/run.sh` and before `apply-branch-rulesets.sh`. Never type a name by hand. A wrong name blocks every merge (trap 3).
3. A skipped job counts as passed. The template skips package-dependent jobs for fork and Dependabot PRs, so its required test job explicitly rejects those PRs.
4. Fork and Dependabot PRs run only the secret-free test job on `ubuntu-24.04`. They need a reviewed same-repository branch with full checks before merge.

## Image tags

| Tag | Pushed by | Read by |
| --- | --- | --- |
| `<sha>` | `homolog` and `main` | audit and rollback |
| `tree-<tree>` | `homolog` | the `main` promotion |
| `homolog` | `homolog` | humans only |
| `approved-homolog-<sha>` | `homolog`, last | homolog deploy |
| `approved-<sha>` | `main`, last | production deploy |

1. Production deploy reads only `approved-<40 hex>`.
2. A `main` tree with no homolog image fails the promotion. This blocks a direct hotfix on `main`.

## Environment contract

1. Both environments deploy the tested digest. Each has its own database, volumes, port, hostname, state and credentials.
2. Homolog never uses production data, production secrets or a production side effect (see [environments and secrets](environments-and-secrets.md)).
3. Health proves the running digest and the configured revision field. Automatic rollback uses the recorded previous digest or image ID. Rollback restores the previous application image. It does not reverse database migrations.
4. Migrations are additive. A destructive migration aborts the deploy and runs by hand.

## Engine releases

The latest engine release is the highest `v*` tag of `ci-workflows`.

1. In a clone of `ci-workflows`, the orchestrator runs `scripts/release.sh vX.Y.Z` and opens the `release/vX.Y.Z` PR into `main`.
2. The owner merges the release PR.
3. The owner needs the `gh` scope `admin:org`. Add it with `lvgs-access gh auth refresh -h github.com -s admin:org`.
4. In the engine clone, the owner runs `lvgs-access scripts/release-finalize.sh vX.Y.Z [--dry-run]`. Use `--dry-run` to preview, then omit it to apply.
5. The finalizer finds the merged release PR and checks its pins. It creates a lightweight tag at the merge commit. It adds `lvgs-dev/ci-workflows/.github/workflows/deploy.yml@<sha>` to runner group `deploy` and reads back the access list. It never moves a tag or removes entries. Agents never push release tags.
6. The orchestrator opens a pin PR in each project. Update the four `uses:` in `.github/workflows/ci.yml` and any tests or docs that name the old SHA. Verify that all pins use the release commit SHA.

## Libraries

1. Libraries use the same branches and the check jobs. They have no image and no deploy.
2. `templates/library/.github/workflows/publish.yml` publishes to GitHub Packages on a `v*` tag from `main`.

## Verify a workflow change

1. Run the project check command and the structure tests in `deploy/tests/`.
2. Open a PR into `homolog`. Confirm that each required check name appears.

## Related

- [Branch protection](branch-protection.md): Rulesets and merge methods.
- [Environments and secrets](environments-and-secrets.md): Names of variables and secrets.
- [Branches and naming](branches-and-naming.md): Branch model and the merge contract.
- [CI and CD traps](ci-cd-traps.md): Failures that these rules prevent.
