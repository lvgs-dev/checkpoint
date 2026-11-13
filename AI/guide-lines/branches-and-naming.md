---
name: branches-and-naming
description: Required branch model, task branch names, PR targets, merge methods and the merge contract for every project.
type: reference
area: guide-lines
---

# Branches and naming

Start with [AGENTS.md](../../AGENTS.md). Read this file for every task that changes a repository.
Settings that enforce these rules are in [branch protection](branch-protection.md).

## Long-lived branches

1. `homolog` is the integration branch. It deploys the homolog environment.
2. `main` is the production branch. It deploys production.
3. Both accept changes only through a pull request. Neither accepts force pushes or deletion.

## Task branches

1. Create every task branch from `homolog`.
2. Use the form `<prefix>/<name>` with one prefix of: `feat`, `fix`, `refactor`, `docs`, `chore`, `ci`, `test`, `perf`, `build`.
3. Write the name in kebab-case. Make it describe the full diff.

Good names: `feat/supplier-csv-import`, `ci/publish-homolog-tag`. Bad names: `fix/stuff`, `update`.

## Merge methods

| PR | Target | Method |
| --- | --- | --- |
| Task PR | `homolog` | squash |
| Promotion PR | `main` | merge commit |
| Resync PR `chore/resync-homolog-from-main` | `homolog` | merge commit (exception) |

`Protect main` allows only the merge commit. `Protect homolog` allows squash and merge commit.

## Merge contract for `homolog`

Agents may merge anything into `homolog` without approval. Only the checks gate it. The bot merges task PRs. There is no auto-merge workflow, no merge token and no reviewer step.

1. Every required check on the PR head has `conclusion == success`. Never merge on `pending`.
2. Run `gh pr merge <n> --squash --delete-branch --match-head-commit <head sha>`. A new push makes it fail.
3. Watch the `homolog` push run: `gh run list -b homolog -L 1`.
4. Leave the `homolog` to `main` PR open. Open it when it does not exist. The owner approves it. That is the application promotion approval. For engine releases, the owner merges and runs the finalizer in [engine releases](ci-cd.md#engine-releases).
5. The owner has no step on `homolog`.

A merge made with the App token of the bot starts the `push` run.

## Why ancestry matters

1. Normal flow keeps `homolog` an ancestor of `main`. The promotion PR is a merge commit with the `homolog` tip as a parent.
2. A squash into `main` creates a commit with one parent. The `homolog` tip stays outside `main`, and the next promotion shows old changes again.
3. Divergence has one cause: a commit made on `main` that `homolog` lacks.

## Never commit to main

1. The ruleset blocks direct pushes. No hotfix goes directly to `main`.
2. Urgent fix: task branch from `homolog`, PR into `homolog`, then the promotion PR as soon as the fix is there. The fast path skips the wait for other work. It never skips checks or approval.

## Promotion

1. Open a PR from `homolog` to `main`. Wait until the publish run of the current `homolog` tip is green, because promotion fails closed when that tip has no image.
2. Wait for the required checks.
3. The owner approves, then merges with the merge commit method. The engine retags the tested manifest in GHCR without rebuilding or repushing the image. Production uses the identical digest.

Engine and harness repositories use their own protected integration branch. In `ci-workflows`, the orchestrator prepares `scripts/release.sh vX.Y.Z` and opens the release PR. The owner merges and runs `lvgs-access scripts/release-finalize.sh vX.Y.Z [--dry-run]`. The orchestrator then opens project pin PRs. Projects pin the release tag's 40-hex commit SHA. Follow [engine releases](ci-cd.md#engine-releases) for the full procedure. Agents never push release tags.

## Resync when `main` has a commit that `homolog` lacks

1. Create `chore/resync-homolog-from-main` from `homolog` and merge `main` into it.
2. Open a PR into `homolog`. After the checks, merge it with a merge commit so `main` is an ancestor of `homolog` again.
3. Never force-push. Never reset `homolog` to `main`.

## Related

- [Branch protection](branch-protection.md): How the rules are enforced.
- [CI and CD](ci-cd.md): What runs after a merge.
- [Environments and secrets](environments-and-secrets.md): Where each branch deploys.
