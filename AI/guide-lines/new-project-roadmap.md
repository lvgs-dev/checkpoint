---
name: new-project-roadmap
description: Ordered roadmap from an empty repository to automated CI and CD with a homolog and a production environment. Lists owner steps and agent steps.
type: how-to
area: guide-lines
---

# New project roadmap: from zero to automated CI and CD

Start with [AGENTS.md](../../AGENTS.md). Read this note when you create a project that deploys to Atlas.
It names every piece, the right order, and who does each step.
The fastest path for a static site is `lvgs --start-new-project`. See [the lvgs command](lvgs-command.md).

For delivery setup, run `lvgs-bootstrap scaffold <kind>`, read only the generated checklist; do not read the engine repository or sample projects.
Choose `static-site` for Vite, Storybook or docs. Choose `python-service` for the existing backend kit.
Run the command from the Subharness installation with the target application folder:

```bash
scripts/lvgs-bootstrap scaffold static-site --target <DIR> --project <project> --port <host-port> --hostname <hostname>
```

Use `--build-command` and `--output-dir` when the build differs from `pnpm build` and `dist`.
Pass `--ci-workflows-ref <release SHA>` to select a release explicitly.
Otherwise the command uses `bootstrap.json` or resolves the highest stable engine release tag to its commit SHA.
It stops with one error when resolution fails. It never writes a branch pin.
Add `--homolog` only when the project needs a homolog deploy job. Publishing on `homolog` still supplies the image for promotion.
Use `--dry-run` to preview. Conflicting files stop the whole write; identical files are safe to repeat.

The command creates the delivery files and `AI/operations/delivery-checklist.md`.
It prints that same checklist. Follow its remaining owner actions in order.
Use `lvgs-bootstrap instructions --target <DIR>` to print it again.
The phase reference below is for owners and maintainers. Agents use the generated checklist for setup.

A visual map of the whole infrastructure (servers, networks, credentials, environments, and permissions) is in `AI/guide-lines/infra-map.html`.
Open it in a browser. It has no secret value.

## End state

After the last phase, the project behaves as follows:

- A push to `homolog` runs the tests, builds one image, and publishes it to GHCR. It deploys to the isolated homolog VM when `DEPLOY_HOMOLOG` is `true`.
- A pull request from `homolog` to `main` needs the owner's approval. The merge retags the tested manifest in the registry. It never rebuilds or repushes the image. The digest stays identical.
- The merge to `main` deploys that image to production. A failed health check rolls production back by itself.
- Each environment has its own container, database, volume, port, secrets, state folder, and public hostname.
- Secrets and settings live in GitHub Environments. No person edits files on the server.
- Agents work through pull requests as a bot. They never merge into `main`.

## Roles

| Role | Who | What it does |
| --- | --- | --- |
| Owner | The human | Clicks in GitHub and Cloudflare. Runs `sudo` on the server. Approves the merge to `main`. |
| Agent | An LLM acting as the bot `lvgs-agents` | Writes code, tests, scripts, and docs. Opens pull requests. Merges into `homolog` when every required check is green, with no approval. Keeps the `homolog` to `main` PR open. |
| Oreon runner | Host Oreon, label `oreon` | Runs tests, builds the image, and publishes it. It never deploys. |
| Atlas runner | Host Atlas, label `atlas-deploy`, user `github-deploy` | Runs the production deploy job only. It pulls the image and starts the containers. |
| Homolog runner | A VM on Oreon, label `homolog-deploy`, see [homolog VM](homolog-vm.md) | Runs the homolog deploy job only. Has no route to production. |

## Tools and names

| Area | Tool or name | Use |
| --- | --- | --- |
| Source and CI | GitHub, GitHub Actions, GitHub Environments, rulesets | Branches, pipeline, per-environment settings, protection |
| Images | GHCR (`ghcr.io/lvgs-dev/<project>`) | Stores the images. Production deploys by digest. |
| Private npm packages | GitHub Packages (`@lvgs-dev/ui`) | Library for the frontend. CI reads it with `GITHUB_TOKEN`. |
| Bot identity | GitHub App `lvgs-agents` | Short-lived tokens for agents. Replaces personal tokens. |
| Build host | Oreon, Podman (rootless) | Builds and tests. |
| Run hosts | Atlas and the homolog VM, Docker and Compose | Atlas runs production. The isolated VM on Oreon runs homolog when enabled. |
| Public access | Cloudflare Tunnel `atlas`, DNS, Access | Hostnames, TLS, login. A reusable Access policy holds the allowed e-mail. |
| Database | PostgreSQL 17, Alembic migrations | One database container per environment. |
| Task tracking | Beads (`bd`) | One task per change. |
| Server helpers | `lvgs-browser`, `lvgs-env-apply`, `lvgs-access` | Screenshots, Environment upload, owner access. See [the server guide](../../AGENTS.md). |
| Checks of docs | `scripts/check-docs.py` | Validates Markdown links. |

## Names, hostnames, and ports

Pick these names in phase 0. Never change them later.

| Item | Rule | Example (`server-supply`) |
| --- | --- | --- |
| Project name | Lowercase, dashes | `server-supply` |
| Production hostname | `<project>.gps.dev.br` | `server-supply.gps.dev.br` |
| Homolog hostname | `homolog-<project>.gps.dev.br` | `homolog-server-supply.gps.dev.br` |
| Compose project, production | `<project>` | `server-supply` |
| Compose project, homolog | `<project>-homolog` | `server-supply-homolog` |
| Loopback port, production | Next free `80N0` | `8000` |
| Loopback port, homolog | Production port plus one | `8001` |
| State folder, production | `/var/lib/<project>-production` | `/var/lib/server-supply-production` |
| State folder, homolog | `/var/lib/<project>-homolog` | `/var/lib/server-supply-homolog` |
| Environment files | `<state folder>/env` | `/var/lib/server-supply-production/env` |

Two projects must never share a port. Keep this table current.

| Project | Production port | Homolog port |
| --- | --- | --- |
| `server-supply` | 8000 | 8001 (homolog switched off for this project) |
| next project | 8010 | 8011 |

## The order at a glance

| Phase | Title | Who | Done when |
| --- | --- | --- | --- |
| 0 | Decide names and ports | Owner | The table above is filled. |
| 1 | Create the repository | Owner | Branches, App access, and settings exist. |
| 2 | Check the server prerequisites | Owner | Runners are online and folders exist. |
| 3 | Build the application skeleton | Agent | The app runs locally with a health route and tests. |
| 4 | Write Dockerfile and Compose files | Agent | The image builds and passes its smoke test. |
| 5 | Write the CI jobs | Agent | Three checks run on every pull request. |
| 6 | Pin the publish workflow | Agent | A push to `homolog` publishes the tested digest. |
| 7 | Configure the project contract and tests | Agent | Project delivery tests pass. |
| 8 | Create the Environments and secrets | Owner | Both Environments hold every value. |
| 9 | Prepare Cloudflare | Owner | The token, tunnel, and Access policy ids are known. |
| 10 | Write the deploy jobs | Agent | The jobs pass review. |
| 11 | Apply the branch protection | Owner | Both rulesets are active. |
| 12 | First deploy of homolog | Agent and owner | The homolog hostname answers. |
| 13 | First promotion to production | Owner and agent | The production hostname answers. |
| 14 | Hand over | Agent | Docs, runbook, and acceptance list are complete. |

Read [security and access](new-project-security-and-access.md) before phase 1. Do the phases in this order. Phases 3 to 7 can overlap, but phase 11 must wait for a green CI run (see the traps note).

## Phase 0: decide names and ports

Owner:

1. Choose the project name and the two hostnames.
2. Choose a free loopback port on Atlas and one on the homolog VM. Run `ss -ltn | grep -E ':80[0-9]{2}'` to see used ports.
3. Decide if the project needs a database, a frontend, and a private npm package.
4. Decide if homolog runs on its isolated VM on Oreon or stays switched off. Never run homolog on Atlas.
5. List every external side effect (device polling, e-mail, SMS, webhooks, queues, payments, third-party APIs). Homolog keeps each one off or in sandbox mode, see [environments and secrets](environments-and-secrets.md).

## Phase 1: create the repository

Owner:

1. Create the repository in the organization `lvgs-dev`. Keep it private.
2. Push `main`. Then create `homolog` from `main`: `git push origin main:homolog`.
3. In the settings of the App `lvgs-agents`, add the new repository.
4. Allow squash merge and merge commit. Turn on "delete branch on merge".
5. Add the repository to the runner group `deploy` if it is not already selected. The runner-workflow entry is already covered by the finalized engine release SHA.
6. Add `AGENTS.md`, `CLAUDE.md`, and `AI/` from this repository. Run the `start-ai-setup` skill if the project already exists.

Agent:

1. Open a pull request with the project guide. Use the commands and map from the real project.

Done when the bot can push a branch and open a pull request in the new repository.

## Phase 2: check the server prerequisites

These steps happen once per host. Skip them if the host already runs another project.

Owner, on Atlas:

1. Create the runner user: `sudo useradd --create-home --shell /bin/bash github-deploy`, then `sudo passwd -l github-deploy`.
2. Add it to the docker group: `sudo usermod -aG docker github-deploy`. Give it no `sudo`.
3. Install the organization runner as a service for that user. Use labels `atlas-deploy` and runner group `deploy`.
4. Check the tools: `docker compose version`, `jq --version`, `curl --version`, `flock --version`, `python3 --version`.
5. Create the shared network and attach the tunnel container, once:
   `docker network create edge` and `docker network connect edge cloudflared`.
   Repeat the second command if someone recreates `cloudflared`.

Owner, on Oreon:

1. Check the runner has label `oreon` and runs Podman rootless.
2. Check the tools: `podman --version`, `jq`, `curl`, `flock`, `python3`, `git`.

Owner, for each project, on Atlas:

1. Create the production state folders:
   `sudo install -d -o github-deploy -g github-deploy -m 700 /var/lib/<project>-production /var/lib/<project>-production/env`
2. When homolog is enabled, follow [homolog VM setup](homolog-vm.md). Create `/var/lib/<project>-homolog` and its `env` folder on that VM, owned by its runner user.

Done when the required runners are Idle and each environment has its folders on the correct host.

## Phase 3: build the application skeleton

Agent:

1. Write the app so that it reads all settings from environment variables.
2. Read secrets from files under `/run/secrets/<name>`. Never read them from the image.
3. Add a health route, `GET /api/health`. It returns HTTP 200 only when ready and reports the image revision. Declare its revision field in `deploy/project.json`.
4. Use relative URLs in the frontend. Never bake a hostname, a port, or a key into the build.
5. Add migrations with Alembic. Make each migration additive: add columns and tables, never drop or rename.
6. Write the tests first. Run them in CI without a network.
7. Add `.env.example` with names and no values.

Done when `pytest` (or the project test command) passes and the health route answers.

## Phase 4: create the Dockerfile and Compose files

Run `lvgs-bootstrap scaffold <kind>` with the project inputs above.
The command renders the Dockerfile, Compose files, contract and workflow together.
The static-site image runs as a non-root user. Caddy serves `/health` with the runtime revision.
Base images are digest-pinned. Production Compose consumes an image digest and never builds.

## Phase 5: create the CI jobs

Scaffold creates the thin `.github/workflows/ci.yml` with image check, publish and production deploy.
Static-site CI sets up Node, then installs pnpm with `npm install --global pnpm@<version>`.
It adds a homolog deploy job only with `--homolog`.

## Phase 6: pin the publish workflow

Scaffold pins engine calls to the resolved 40-hex release commit SHA.
Runner access is already covered by the engine release sha entry.
The owner has no manual runner-workflow allowlist step for a finalized release.

## Phase 7: validate the generated contract

Scaffold validates `deploy/project.json` before writing any files.
It uses the vendored contract rules, or `LVGS_CONTRACT_VALIDATOR` when configured.
The guided `init` command asks for the kind in step 02 and calls the same renderer in step 04.
Old states without a kind keep `python-service` behavior.
Follow only the printed checklist after generation. Do not inspect other repositories to reconstruct delivery rules.

## Phase 8: create the Environments and secrets

Owner:

1. In the repository settings, create the Environments `homolog` and `production`.
2. Set the deployment branch policy: `homolog` only for `homolog`, `main` only for `production`.
3. Add no required reviewers. The approval happens on the pull request.
4. Fill the values. Use the table in [environments and secrets](environments-and-secrets.md) and the project manifest `deploy/env-manifest.json`.
5. Declare optional values as `required:false` in the manifest. GitHub cannot store empty secrets. Omit absent optional secrets. Template `APP_*` names and `app_secret_key` are examples. Use `lvgs-env-apply` to send a prepared file: `lvgs-access lvgs-env-apply lvgs-dev/<project> <environment> <file> --apply`.
6. Use a different database password in each environment.

Agent:

1. Prepare the files with every non-secret value filled. Leave secrets empty and name the source of each.

Done when `gh api repos/lvgs-dev/<project>/environments/<env>/variables` lists every name.

## Phase 9: prepare Cloudflare

Owner, once for the account:

1. Create an API token for the zone. Scopes: Tunnel Edit, DNS Edit, Access Apps and Policies Edit. Set an expiry of 90 days.
2. Create one reusable Access policy `Allow`, with the owner e-mail. Note its id.
3. Note the account id, the zone id, and the tunnel id.
4. Keep the token in your own shell or password manager. Never store it in GitHub, in a repository or in the agent home.

Owner, once for production and for homolog only when `DEPLOY_HOMOLOG=true`:

1. Start the containers once so the unique container name exists (`<project>-<service>-1`, or `<project>-homolog-<service>-1`).
2. In Cloudflare Zero Trust, add the public hostname to the correct tunnel. Use the container URL printed in the generated checklist.
3. Add a self-hosted Access application for that hostname. Select the owner Allow policy.

The deploy jobs only check the public endpoint. They hold no Cloudflare API credential. An optional read-only Access health token is separate.

Done when each enabled hostname answers with a 302 to Cloudflare Access.

## Phase 10: check the reusable deploy calls

Scaffold creates a production call to the shared `deploy.yml` workflow. It passes the published digest,
project owner and selected host port. It adds a separate homolog call only with `--homolog`.
Keep route creation outside CI. Check the generated checklist for remaining owner actions.

## Phase 11: apply the branch protection

Owner, after the first green CI run on `homolog`:

1. Copy the ruleset files from `templates/project/.github/rulesets/`.
2. Run the project's `python3 scripts/generate-rulesets.py --write`. It derives the required check names from `ci.yml`. Never type the names by hand.
3. Run the project's `scripts/apply-branch-rulesets.sh --owner lvgs-dev --repo <project> --dry-run`, then without `--dry-run`.
4. Check the result: `Protect homolog` needs a pull request and green checks. `Protect main` also needs one approval and allows only merge commits.

Never apply a ruleset before its checks have run once. The merge would wait forever.

## Phase 12: first deploy of homolog

Run this phase only when `DEPLOY_HOMOLOG=true`. Otherwise confirm the homolog publish is green, then continue to phase 13.

Agent:

1. Merge the deploy job into `homolog` through a pull request.
2. Watch the run: `gh run watch` or `gh run view --log-failed`.
3. Fix each failure with a small pull request.
4. Verify with the checklist in [the workflow note](new-project-workflow-and-scripts.md).

Owner:

1. Open `https://homolog-<project>.gps.dev.br` and sign in.

Done when the homolog hostname answers and the database is migrated.

## Phase 13: first promotion to production

Agent:

1. Wait for a green publish on the last `homolog` commit. When homolog deployment is enabled, also wait for its health checks.
2. Open a pull request from `homolog` to `main`. Summarize what changes in production.

Owner:

1. Read the pull request. Approve it.
2. Merge with "Create a merge commit". The tree of `main` must equal the tree of `homolog`.

Agent:

1. Watch the run. Confirm the production digest equals the tested homolog digest. Check the running image identity, health revision, database revision, and hostname.
2. Keep the pinned engine checkout's `deploy/rollback.sh` ready with the production overrides.

Done when the production hostname answers and the data is intact.

## Phase 14: hand over

Agent:

1. Update `AI/architecture/` and `AI/operations/` for every piece you added.
2. Write the runbook: change a value, roll back, add a migration, hotfix, restore a backup.
3. Record the port in the table of this note.

## Day-2 tasks

| Task | How |
| --- | --- |
| Change a setting or secret | Edit the Environment. Re-run the deploy job. |
| Roll back production | Run the pinned engine checkout's `deploy/rollback.sh` with the production overrides. It restores the recorded previous digest. |
| Add a migration | Make it additive. A destructive migration aborts the deploy. The owner runs it by hand. |
| Hotfix | Fix on a branch. Merge into `homolog`. Promote. Never change `main` directly. |
| Switch the homolog deploy off or on | Set the repository variable `DEPLOY_HOMOLOG`. See [switches](new-project-workflow-and-scripts.md#switches). Stop the containers by hand when you switch off. |
| Rotate the Cloudflare token | The owner creates a new token in the private shell or password manager. Never upload it to GitHub. Revoke the old token. |
| Change something shared, for example a font in `@lvgs-dev/ui` | Change the library, update `CHANGELOG.md`, and raise the version. The owner pushes the tag `vX.Y.Z`. The publish workflow creates the package version. Then update each app by hand, see below. |

### Update a shared library in each app

A change in `lvgs-ui` reaches an app only after that app raises its dependency. The apps pin an exact version, and the deploy installs with a frozen lockfile.

1. Publish the new version of the library. The owner pushes the tag.
2. In each app, change `@lvgs-dev/ui` in `frontend/package.json` to the new exact version.
3. Regenerate `pnpm-lock.yaml`. The server has no Node and no package token. Run `pnpm install --lockfile-only` in a CI job that has `packages: read`.
4. Open a pull request into `homolog`. CI builds and tests. The merge deploys homolog.
5. Look at the screens with `lvgs-browser`. A visual change in the library changes every app.
6. Promote to `main` with the owner's approval.

A tool such as Dependabot can open step 2 and 3 for you. Add it per app when you want it.
If only one app needs another look, choose another colour theme in its `lvgs.config.ts`. Never override a token in app CSS: an app has no CSS. A missing capability becomes a library task. See [start a React frontend](frontend-start-react-app.md).

## Shared engine releases

The latest engine release is the highest `v*` tag of `ci-workflows`. Follow [engine releases](ci-cd.md#engine-releases): the orchestrator prepares the release PR, the owner merges and runs `lvgs-access scripts/release-finalize.sh vX.Y.Z [--dry-run]`, then the orchestrator opens project pin PRs. See [mission status](https://github.com/lvgs-dev/subharness/blob/main/AI/ci-cd-review/mission.md) for production evidence and the remaining canary rehearsal.

The guided bootstrap stores progress in `.git/lvgs-bootstrap-state.json`. Use `init`, `resume`, `status`, `verify`, and `doctor`. It pauses at owner-only gates. It uses per-environment tunnel IDs, requires the pinned reusable deploy workflow, supports projects without a database, and leaves absent optional secrets unset. Host-folder setup still assumes Atlas for both environments. Homolog belongs on its isolated VM. The canary rehearsal gate is not built. See [mission status](https://github.com/lvgs-dev/subharness/blob/main/AI/ci-cd-review/mission.md) for the next real bootstrap run.

## Starter prompt for the agent

Paste this into the agent session after phase 2:

> Run `lvgs-bootstrap scaffold <kind> --target <DIR> --project <project> --port <host-port> --hostname <hostname>`.
> Read only the generated checklist. Do not read the engine repository or sample projects.
> Follow the checklist in order. Keep delivery changes in a pull request. The owner approves production promotion.

## Acceptance list

- [ ] Production answers after Access login. Homolog does too when enabled.
- [ ] A push to `homolog` runs tests and publish. Its deploy runs when enabled.
- [ ] The pull request to `main` needs the owner's approval.
- [ ] The production image has the same digest as the homolog image.
- [ ] The production database container was not recreated by the deploy.
- [ ] A failed health check restores the previous image.
- [ ] No personal token exists in the repository, the server, or the Environments.
- [ ] `bash deploy/tests/run.sh` passes on Oreon.
- [ ] The docs describe the real state, and `check-docs.py` reports no problem.

## Related

- [New project: compose and Dockerfile](new-project-compose-and-dockerfile.md): Examples to copy.
- [New project: workflow and scripts](new-project-workflow-and-scripts.md): Jobs, tags, variables, scripts, and checks.
- [CI and CD traps](ci-cd-traps.md): Failures that already happened and how to avoid them.
- [Security and access](new-project-security-and-access.md): Identities, the GitHub App, tokens, file modes, and who may do what.
- [CI and CD standard](ci-cd.md): The delivery rules.
- [Environments and secrets](environments-and-secrets.md): Where each value lives.
- [Branch protection](branch-protection.md): Ruleset rules.
- [Branches and naming](branches-and-naming.md): Branch and pull request names.
