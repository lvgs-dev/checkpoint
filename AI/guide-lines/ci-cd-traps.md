---
name: ci-cd-traps
description: Failures that happened while we built the CI and CD flow of server-supply. Each entry gives the symptom, the cause, and the rule that avoids it.
type: reference
area: guide-lines
---

# CI and CD traps

Start with [the roadmap](new-project-roadmap.md). Read this note before you write a workflow, a Compose file, or a ruleset.
Every trap below cost real time. Each one has a rule and, where possible, a test.

## 1. A `workflow_run` workflow never ran for `homolog`

- Symptom: CI passed on `homolog`, but no publish run existed.
- Cause: GitHub reads a `workflow_run` workflow from the default branch only.
- Rule: put `publish` and the deploy jobs in `ci.yml` and link them with `needs`. Each branch uses its own file.
- Current kit: thin calls to the engine reusable `publish.yml` and `deploy.yml` stay in `ci.yml`. These reusable workflow names do not imply a second project pipeline.

## 2. A variable written to `$GITHUB_ENV` was empty in the same step

- Symptom: `DIGEST: unbound variable` in the publish step.
- Cause: `$GITHUB_ENV` and `$GITHUB_OUTPUT` reach later steps only.
- Rule: keep the value in a shell variable inside the step. Export it to later steps only at the end.
- Rule: keep registry logic in the shared engine scripts. Test them there with fake registry and container tools.

## 3. The ruleset waited for checks that did not exist

- Symptom: every merge waited forever.
- Cause: the ruleset template names `typecheck`, `test`, `build`, and `docker-image`. The real jobs have other names.
- Rule: copy the exact job `name:` values into the ruleset files.
- Rule: apply the rulesets only after each check has run green once.

## 4. A non-root container could not read a secret file

- Symptom: `PermissionError: /run/secrets/db_password`.
- Cause: the secret file had mode 600 and belonged to the runner user. The container user is different.
- Rule: write secret files with mode 644 inside a folder with mode 700. Keep `.env` at 600.

## 5. Two environments answered to the same name

- Symptom: the production hostname alternated between production and homolog data.
- Cause: Compose adds the service name as a DNS alias on every network of the container. Both apps have the service `app`. The tunnel container sat on both networks.
- Rule: route the tunnel to the unique container name. Find it with Compose labels.
- Rule: never route by a service name when the tunnel container joins more than one project network.

## 6. The first migration looked destructive on an empty database

- Symptom: the migration check exited 5 on a new database.
- Cause: migration 0002 contains operations that the check marks as destructive. Nothing could be lost on an empty database.
- Rule: initialize an empty homolog database in the ci-workflows engine's `bootstrap-db.sh`. Never do this for production.
- Rule: keep the check strict. Do not weaken it.

## 7. pnpm blocked our own new package

- Symptom: `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` for `@lvgs-dev/ui`.
- Cause: pnpm refuses packages younger than one day.
- Rule: exclude only the first-party package in `pnpm-workspace.yaml` with `minimumReleaseAgeExclude`. Keep the rule for all others.

## 8. Private packages need the right token

- Symptom: `401` from `npm.pkg.github.com`.
- Cause: fine-grained personal tokens do not work with GitHub Packages.
- Rule: in CI use `GITHUB_TOKEN` with `packages: read`. In the package settings, give the repository access under "Manage Actions access".
- Rule: never store a personal token for this.

## 9. A tool was missing on a runner

- Symptom: `jq: command not found` on Oreon. The tests passed on Atlas.
- Cause: the runners do not share the same tools.
- Rule: list the tools of each runner in the setup note. Check them in the first step of a job that needs them.
- Rule: prefer running tests inside a container with pinned tools.

## 10. The route script must never replace the tunnel list blindly

- Cause: the Cloudflare API replaces the whole ingress list on write.
- Rule: read, add one rule before the catch-all, write, and read back. Take a lock. Never delete.
- Rule: create the Access app first, then the route, then the DNS record. A hostname must never exist without Access.
- Rule: the Access app references one reusable policy by id. Never write an e-mail list per app.

## 11. A pull request status "pending" is not "green"

- Symptom: a pull request merged while a check was still pending, and the check later failed on Oreon.
- Rule: read the final state of every required check right before the merge.
- Rule: merge only with `--match-head-commit <the checked sha>`.

## 12. Do not rewrite a published branch

- Rule: never `rebase` and `push --force` a branch that has a pull request. Create a new branch from the integration branch and open a new pull request. Close the old one.

## 13. The old `gh` fails on `pr edit`

- Symptom: `GraphQL: Projects (classic) is being deprecated`.
- Cause: `gh` 2.46 queries a field that GitHub removed.
- Rule: use `gh api -X PATCH repos/<owner>/<repo>/pulls/<n> -f base=<branch>`. Upgrade `gh` when you can.

## 14. Agent sandboxes protect the git folder of worktrees

- Symptom: an agent in a sandbox edited files but could not commit in a worktree.
- Rule: give such an agent a full clone, or let the orchestrator commit. Do not rely on a worktree.

## 15. Shared hosts need unique everything

- Rule: give each environment its own project name, network, volume, port, state folder, lock, and local image tag.
- Rule: pin the production port, project name, and alias as literals in the production job. A person must not change them in a web form.
- Rule: an inherited variable such as `HEALTH_URL` must not move the homolog check to the production port. Derive it from the environment.

## 16. A stopped container stays stopped

- Fact: with `restart: unless-stopped`, a container that you stop by hand does not start again after a reboot.
- Use: to switch an environment off, stop its containers and change the repository variable `DEPLOY_HOMOLOG`. See [switches](new-project-workflow-and-scripts.md#switches).
- Rule: the pilot and template use the opt-in form (`== 'true'`). Bootstrap sets it from the project answer. Keep it off until the isolated homolog runner and route exist.

## 17. The workflow must not trust the person who edits variables

- Rule: only values that can differ between environments belong in Environment variables.
- Rule: values that must never differ belong in the job as literals, and a test must check them.

## 18. Timing of the first run

- Fact: a job that only runs on a push (publish, deploy) cannot run on the pull request that adds it. The first real run happens after the merge.
- Rule: review these jobs line by line. Test their logic with fake tools. Expect one or two fix pull requests after the first run.

## 19. "Approval from someone other than the last pusher" blocks the only approver

- Symptom: the owner cannot approve the `homolog` to `main` PR, even after the bot pushed last and the PR was closed and reopened.
- Cause: `require_last_push_approval: true` in `Protect main`. With one owner and one bot it cannot be satisfied reliably.
- Rule: keep it `false`. Do not add a bypass actor. The approval, the checks and the merge commit method stay required.

## 20. A pull request job can poison the publish build on Oreon

- Cause: Oreon is one persistent runner. Podman storage survives between jobs. A PR job could tag a malicious image under a base image name, and the next publish would build on it.
- Rule: pin every `FROM` by digest, build with `--pull=always`, and start the publish job with `podman rmi --all --force`. A test checks all three.

## 21. The tunnel container sits next to the database

- Cause: production had no `edge` network, so `cloudflared` was attached to the project `_internal` network by hand, next to PostgreSQL.
- Rule: both environments join `edge` through `compose.edge.yaml`. `cloudflared` joins `edge` only. After the first deploy run `docker network disconnect <project>_internal cloudflared`. Preflight warns while it is attached.

## 22. Promotion changed the digest

- Cause: pulling and repushing through Podman recompressed layers.
- Rule: the engine retags the manifest in the registry. Never rebuild or repush the image on `main`. Read back both production tags and compare digests.
- Cause: Podman `RepoDigests` can differ from the registry manifest digest for a Docker v2.2 manifest.
- Rule: identify the tested image by its config digest (Podman `.Id`) and `org.lvgs.tree` label. Take the deploy digest from the registry.

## 23. A reusable deploy was not allowed on the runner

- Cause: the runner group listed the project caller instead of the shared deploy workflow.
- Rule: the bootstrap gate requires `lvgs-dev/ci-workflows/.github/workflows/deploy.yml@<40-hex release SHA>`. The owner runs the finalizer from [engine releases](ci-cd.md#engine-releases) to add release access in `deploy`.

## 24. An optional secret could not be uploaded

- Cause: GitHub cannot store empty secrets, and the engine validator rejects `allow_empty` on secrets.
- Rule: `allow_empty` makes a variable optional. For secrets, use `required:false` and leave absent values unset.
- Rule: declare optional values with `required:false`. Omit absent secrets. `APP_REQUIRED_SETTING` and `app_secret_key` are template examples, not engine requirements. Preflight reads the project manifest.

## 25. A queued run has no jobs

- Symptom: a run stays `queued`, but has no jobs, or a PR has no check runs at all.
- Rule: check that jobs exist before blaming the runner queue. Without jobs, run creation is missing or stuck.
- Cause: `mergeable` conflicts can prevent pull request runs from being created. Resolve them first.
- Rule: push a new commit to trigger checks for a PR with no check runs. Merging the base branch is one example.
- Check: confirm that the new run has jobs, then follow the [final check rule](#11-a-pull-request-status-pending-is-not-green).

## 26. A promotion ran before the homolog run of the last merge finished

- Symptom: the production publish job fails with `no tested homolog image for this tree`, and a re-run is refused with `cannot be rerun; its workflow file may be broken`.
- Cause: the publish job on `main` reuses the image that the `homolog` push run built for the same tree. A green pull request is not enough. The `homolog` run of the last merge can still be queued behind the runner.
- Rule: before you merge a promotion, check that the newest `homolog` push run is `completed` with `success`.
- Fix after the fact: wait for that run, then land one new commit through `homolog` and promote again. A failed promotion run cannot be re-run.

## Related

- [New project roadmap](new-project-roadmap.md): The ordered phases.
- [Workflow and scripts](new-project-workflow-and-scripts.md): The jobs and scripts that contain these rules.
- [Security and access](new-project-security-and-access.md): Identities and tokens.
