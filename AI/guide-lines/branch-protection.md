---
name: branch-protection
description: Ruleset policy for homolog, main and release tags, merge methods, strict mode, and the order in which rulesets are applied.
type: how-to
area: guide-lines
---

# Branch protection

Start with [AGENTS.md](../../AGENTS.md). Read this file when you change repository rules or bootstrap a project.

## Plan requirement

1. Rulesets on a private repository need a GitHub organization on the Team plan, or GitHub Pro for a personal account.
2. Without the plan, the rulesets API returns HTTP 403. `scripts/apply-branch-rulesets.sh` stops with that message and applies nothing.

## Repository settings

| Setting | Value | Why |
| --- | --- | --- |
| `allow_auto_merge` | false | The bot merges. No workflow enables auto-merge. |
| `delete_branch_on_merge` | true | Merged task branches do not pile up. |
| `allow_squash_merge` | true | Task PR method. |
| `allow_merge_commit` | true | Promotion and resync PRs. |
| `allow_rebase_merge` | false | Only two methods are used. |

## Rules by branch

| Rule | `Protect homolog` | `Protect main` |
| --- | --- | --- |
| Pull request required | yes | yes |
| Approvals | 0 | 1 code owner (`CODEOWNERS`) |
| Merge methods | squash, merge commit (resync PR only) | merge commit only |
| Required checks | the PR job names of `ci.yml` | the same |
| Strict (branch up to date) | no | no |
| Dismiss stale approval on push | n/a | yes |
| Last pusher cannot approve | n/a | no (single owner) |
| Bypass actors | none | none |
| Deletion and force push | blocked | blocked |

1. Do not add a bypass actor. The bot opens PRs, the owner approves.
2. `require_last_push_approval` is off. With one owner it blocked the owner from approving the promotion PR even after a bot push (trap 19). The guarantee stays: one owner approval, required checks and no bypass.
3. `homolog` has no linear-history rule. That rule would block the resync merge commit.

## Release tags

`Protect release tags` targets `refs/tags/v*` and blocks creation, update and deletion. Only the repository admin role may bypass it. The bot cannot create a release tag.

## Required checks

The check names are the `name:` of the PR jobs in `ci.yml`. `scripts/generate-rulesets.py --write` puts them into `homolog.json` and `main.json`. The apply script refuses when they differ. Do not copy them by hand.

## Strict mode

Strict mode is off on both branches.

1. On `homolog`, many PRs run in parallel. With strict on, each merge makes the others stale and "update branch" is not automatic.
2. On `main`, each promotion leaves a merge commit that `homolog` lacks. With strict on, every promotion PR would look out of date, and updating it would push a merge commit to `homolog`, which the rules forbid.
3. Each check still runs on the PR head. The promotion head already passed the same checks on its own merge.

## Apply order

Apply rulesets last. Never apply them before the checks exist.

1. Copy the templates.
2. Open a PR into `homolog` and wait for a green run of every required check.
3. Run `scripts/apply-branch-rulesets.sh --owner <O> --repo <R> --dry-run`, then without `--dry-run`. The script refuses unless each check name has a green run on the head of `homolog`.
4. In the GitHub UI, confirm that each ruleset shows "Active", not "Evaluate".

The script creates or updates each ruleset by name. It never deletes a ruleset. A second run changes nothing.

## Related

- [Branches and naming](branches-and-naming.md): Branch model and merge methods.
- [Environments and secrets](environments-and-secrets.md): Bootstrap order.
- [CI and CD](ci-cd.md): The checks named in the rulesets.
