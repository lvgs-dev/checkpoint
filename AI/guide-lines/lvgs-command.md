---
name: lvgs-command
description: How to use the `lvgs` command that starts and delivers a new Atlas project. Read it before you run or change `scripts/lvgs`.
type: how-to
area: guide-lines
---

# The lvgs command

Start with [AGENTS.md](../../AGENTS.md). The roadmap stays the source of the rules: [new project roadmap](new-project-roadmap.md).

`lvgs --start-new-project` asks a few questions and runs every step. Each step is also its own flag.
Each step checks first. The setup flow skips finished steps.
Run `--subharness` alone to merge later baseline updates.
For a provider takeover, start with `bash scripts/agent-resume.sh` and follow the [Beads protocol](../architecture/beads.md).
State lives in `<project>/.git/lvgs-state.json`. It holds names and ids only, never a secret.

## Install

```bash
bash scripts/lvgs --install    # links ~/.local/bin/lvgs to this checkout; never overwrites another file
```

## Flags

| Flag                  | What it does                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `--start-new-project` | Asks the path and the name, then runs the steps below in order. Asks "Publish the default project now?" before `--deploy`.                     |
| `--git`               | Runs `git init -b main` when the folder is not a repository.                                                                                   |
| `--subharness`        | Merges committed Subharness baseline files (`AGENTS.md`, `CLAUDE.md`, `AI/`, `.agents/`, `scripts/agent-resume.sh`). Keeps project-only files. |
| `--all`               | Soft-syncs every configured project in order. Prints a summary table.                                                                          |
| `--all --hard`        | Runs the same list with hard sync and backup.                                                                                                  |
| `--subharness-hard`   | Replaces the whole `AI/` folder after confirmation and backup. Soft-merges the other baseline paths. Excluded from the setup flow.             |
| `--ci-workflow`       | Calls `lvgs-bootstrap scaffold <kind>` (default `static-site`) with the name, a free port, the hostname and the newest engine release.         |
| `--github`            | Creates the private repository with owner access, adds `origin`, pushes `main` and creates `homolog`.                                          |
| `--environments`      | Creates the `production` and `homolog` Environments with owner access. Each one accepts only its branch.                                       |
| `--host-folders`      | Prints the sudo line for `/var/lib/<name>-production` and waits until the folders exist.                                                       |
| `--cloudflare`        | Asks for the missing Cloudflare ids and the hidden token. Runs the engine route script in `check` mode, asks, applies, and checks again.       |
| `--default-page`      | Writes `public/index.html` ("Project <name> in progress"), `package.json` and `pnpm-lock.yaml`.                                                |
| `--deploy`            | Opens the PR into `homolog`, waits for checks, merges, waits for the pipeline and opens the promotion PR. The owner approves it.               |
| `--status`            | Shows each step and the saved facts.                                                                                                           |
| `--doctor`            | Checks the local tools and the scaffold support.                                                                                               |
| `--install`           | Links the wrapper into `~/.local/bin`.                                                                                                         |

Common options: `--kind static-site|python-service|node-service`, `--path`, `--name`, `--owner` (default `lvgs-dev`), `--domain` (default `gps.dev.br`), `--hostname`, `--port`, `--ci-workflows-ref`, `--engine`, `--cf-account-id`, `--cf-zone-id`, `--cf-tunnel-id`, `--cf-access-policy-id`, `--publish yes|no`, `--yes`, `--dry-run`, `--ref`, `--force`.
`lvgs start-new-project` works too. The first word may drop the dashes.

## Select the delivery kind

Use `lvgs --ci-workflow --kind node-service` for a pnpm workspace with `apps/web`, `apps/api` and PostgreSQL.
Use `static-site` for a frontend served by Caddy without a database. It stays the default.
Use `python-service` for a Python API with PostgreSQL and Alembic. Its existing kit stays unchanged.
`--port` selects the host port. The container port comes from `deploy/project.json`:
8080 for static sites and 8000 for the service templates.
Run service scaffolding against an existing application. The default page step creates only a static site.

Node services run migrations at API start under a PostgreSQL advisory lock.
The engine accepts only `none` and `alembic` migration kinds, so the Node contract uses `migrate.kind: none`.
Use forward only migrations and expand/contract changes. Image rollback does not reverse the schema.
A generic `command` migration kind in `ci-workflows` is a pending improvement.
Read [the Node runtime contract](new-project-compose-and-dockerfile.md#node-service-runtime-contract) before the first image check.

## Rules

- `--dry-run` prints every external action and runs none. It writes no file.
- The Cloudflare token goes to the engine script through `CLOUDFLARE_API_TOKEN` only. It never reaches argv, logs or files. Set the variable before the run to skip the prompt.
- The engine script comes from `--engine`, `$LVGS_ENGINE_DIR`, or a clone at the pinned release in `.git/ci-workflows`.
- `--yes` takes defaults. Human gates (sudo, Cloudflare guide) still wait.
- Agents never merge into `main`. `--deploy` stops at the promotion PR.

## Sync an existing project

Run from the project folder, or pass `--path <project>`.
The source is this Subharness checkout's committed Git history. Uncommitted source edits are excluded.
By default, sync tries `git fetch origin`. Offline runs use local `origin/main`, then `HEAD`.
Use `--ref <ref>` to select a commit, tag or branch and skip the fetch.
Dry runs skip the fetch and all writes. They still read local Git history and calculate merges.

Soft sync copies new files. It applies upstream edits with `git merge-file`.
It keeps local edits when Git can merge them cleanly.
`AGENTS.md` replaces `<PROJECT_NAME>` and `<INTEGRATION_BRANCH>` in both upstream and base text.
The integration branch becomes `homolog`.

The tracked project file `.subharness-sync.json` records the source and full upstream commit SHA:

```json
{ "source": "subharness", "ref": "0123456789abcdef0123456789abcdef01234567" }
```

Commit this manifest with the synced files. The next run uses that commit as the merge base.
A file absent from that commit uses an empty base.
Without a manifest, sync checks distinct historical file versions.
An exact match wins. Otherwise, the closest version needs a similarity ratio of at least 0.6.
A file below that threshold stays untouched and reports `UNRESOLVED`.
Use `--subharness-hard` for `AI/`, or merge the file by hand.

Each file prints its status. The summary counts new, updated, merged, unchanged and project-only files.
Soft sync reports deleted upstream files as `REMOVED-UPSTREAM` and keeps them locally.
Conflicts write standard `<<<<<<< project`, `=======` and `>>>>>>> subharness@<sha>` markers.
Resolve these markers by hand.
Files named `index.md` keep the lines of both sides and get no markers, because each project adds its own lines to the same lists.
The union never applies a removal. A line that Subharness deletes from an index stays in the project until someone deletes it by hand.
Notes that describe Subharness itself, such as `AI/architecture/delivery-kit.md`, are never copied to a project.
`AI/architecture/index.md` is the exception: it lists the notes of the project, so the project owns it after the first copy. Sync copies it when it is missing and reports `PROJECT-OWNED` after that. It never merges it and never reports it as unresolved.
The manifest advances after a run with conflicts, so the markers become the project's local content.
The manifest stays when a file reports an error, or when a file is unresolved and nothing conflicted.
The next run then retries that file and reports it again until someone fixes it.
Conflict markers become the project's local content for the next merge.
Binary or non-UTF-8 content copies unchanged. A text merge that cannot handle it reports an error.
Exit codes are `0` for clean application, `1` for conflicts or unresolved files, and `2` for errors.
Some files may already be applied when a later file reports an error.

Sync refuses dirty in-scope Git paths, including the manifest. Commit or stash them first.
Soft sync accepts `--force` to bypass this check. Changes outside these paths do not block it.
Review with `git diff` after sync. Use Git to restore tracked files and remove unwanted new files yourself.
`--dry-run` prints the same planned statuses without changing files, state or the manifest.

Hard sync lists every `AI/` file it will overwrite or delete.
It requires `--yes` or the exact interactive answer `yes`.
A dirty tree requires both `--force` and `--yes`.
Before replacement, it copies the current folder into `.git/lvgs-backup/<UTC timestamp>/AI/`.
Git worktrees use their actual Git directory. Non-Git projects use `.lvgs-backup/<UTC timestamp>/AI/`.
The command prints the backup path. Project-only files outside `AI/` remain untouched.
Hard sync can still report soft-merge conflicts in `AGENTS.md`, `CLAUDE.md`, `.agents/` or `scripts/agent-resume.sh`.

```bash
lvgs --subharness --path ./demo --ref origin/main --dry-run
lvgs --subharness --path ./demo --ref origin/main
# Review the diff. Resolve any conflict markers. Commit the files and manifest.
# To replace all AI notes, first review the deletion plan:
lvgs --subharness-hard --path ./demo --ref origin/main --dry-run
lvgs --subharness-hard --path ./demo --ref origin/main --yes
```

## Sync every configured project

Run `lvgs --all --dry-run --ref HEAD` to preview. Remove `--dry-run` to apply. Add `--hard --yes` to back up and replace each AI folder. Both modes accept `--force`.
Edit `scripts/lvgs_cli/projects.json`, or override it with `LVGS_PROJECTS_FILE`. The JSON list uses objects such as `{"name": "demo", "path": "/projects/demo", "aliases": ["/projects/old-demo"]}`.
The default list contains Subharness, lvgs-ui, server-supply and game-list. Game-list falls back to checkpoint. The primary folder wins when both exist.
The final table shows project, status, resolved baseline SHA and file counts or errors. `OK` means applied. `DRY-RUN` means planned. `CONFLICT` includes unresolved files. `FAILED` means sync failed.
Missing folders report `SKIPPED`. Subharness reports `SOURCE`. Neither is synced or causes failure. Projects run in list order. Failures do not stop later projects. Any conflict or failure returns exit code 1.
These actions only change working trees. They never commit, push or open PRs. The single-project confirmation, backup and option rules apply.

## Example session

```text
$ lvgs --start-new-project
Which path will the project be in? Leave empty to use the current folder:
Project/repository name? Leave empty to use the folder name [demo-site]:
>>> --git ... --subharness ... --ci-workflow ... --github ... --environments
=== YOUR TURN: create the production state folders (needs sudo)
  2. sudo install -d -o github-deploy -g github-deploy -m 700 /var/lib/demo-site-production /var/lib/demo-site-production/env
Type y when it is done, q to stop and resume later: y
Do you already have the Cloudflare items (token, account id, zone id, tunnel id, Access policy id)? [y/N]: y
Account ID: ...
Cloudflare API token (hidden):
Apply the route and Access app for demo-site.gps.dev.br? [y/N]: y
Publish the default project now? [y/N]: y
OWNER STEP: open the promotion PR homolog -> main of lvgs-dev/demo-site on GitHub, approve it and merge it.
```

## Related

- [New project roadmap](new-project-roadmap.md): The phases this command automates.
- [CI and CD](ci-cd.md): Release and runner access rules.
