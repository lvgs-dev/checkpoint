---
name: beads
description: Shared tracker, agent claims, durable memory and exact takeover across providers.
type: reference
area: architecture
---

# Beads workflow

Start with [AGENTS.md](../../AGENTS.md). This file is the only source for tracker rules.
Use this protocol for every epic, task and subtask, with any agent provider.

## Protocol

1. **One shared database.** Share one Beads database per repository across all worktrees.
2. **No database per agent.** Never create a database per agent or worktree. Isolate missions with parents, labels and notes.
3. **Check before create.** Run `bd ready` and `bd show <id>` before you create work.
4. **Check the help.** Run `bd <command> --help` before you write a `bd` command into a doc.
5. **Unavailable database.** If the database is unavailable, report the blocker. Never claim that a task exists.
6. **Mission epic.** Create one epic per branch with `bd create '[<branch>] <mission title>' --type epic --labels 'branch:<branch>,worktree:<folder>' --description '<brief>' --acceptance '<done criteria>'`.
7. **Original brief.** Put the owner's ORIGINAL brief verbatim in the epic description, then constraints and links. Put done criteria in acceptance.
8. **Branch names.** Branch names must not contain `,` or `"`. Use `-`.
9. **Task creation.** Create every task and subtask with `--parent <parent-id>`, the labels `branch:<branch>` and `worktree:<folder>`, and `--priority <0-4>`. Priority 0 is highest.
10. **Labels required.** A task without both labels is invisible to the overlap check. Never create one without them.
11. **Task scope.** Each task note lists its scope as `files: <paths>`.
12. **Decisions.** Append each decision to the epic with `bd note <epic-id> '<UTC timestamp> decision: <what> | why: <why> | alternatives: <rejected>'`.
13. **Architecture decisions.** Also record architectural decisions in `AI/decisions/` with the decision template.
14. **Actor.** Set `BEADS_ACTOR` to `<provider>/<agent-id>`, such as `codex/w3` or `claude/opus-1`.
15. **Branch lock first.** The first write on a branch is `bd update <epic-id> --claim`. If it fails, read `lease_expires_at` in `bd show <epic-id> --json`. If the lease is live, another writer is active: stop. If it is expired, use the default takeover (epic first). If there is no lease, ask the coordinator.
16. **Task claim.** After the branch lock, run `bd list -l worktree:<folder> --status in_progress --limit 0`. The result must contain only your claims. Then run `bd update <id> --claim`. Each foreign in_progress task: if its lease is expired, apply the default takeover to it and then heartbeat. If it is live or has no lease, stop and ask the coordinator.
17. **One writer.** Only one agent writes in a worktree and branch at a time. Task claims do not lock a worktree.
18. **Separate worktrees.** Concurrent agents use separate worktrees and branches. Create them with `git worktree add`.
19. **Serialized allocation.** The coordinator serializes worktree allocation.
20. **Dependencies.** Track dependencies with `bd dep add <dependent> <prerequisite>`.
21. **Discovered failures.** Create a bug task for each discovered failure with `--deps discovered-from:<task-id>`, the parent and both labels.
22. **Flags only.** Use flags, never interactive `bd edit`.
23. **Intent note.** Before a long action, run `bd note <id> '<UTC timestamp> intent: <action>'`.
24. **Status note.** After the action, run `bd heartbeat <id>`, then append one line: `<UTC timestamp> status: <state> / commit: <sha> / next: <exact next command or file> / blocker: <none or cause> / verify: <exact command and result>`.
25. **One line per note.** Write each note on one line. Start it with a UTC timestamp, such as `2026-11-13T15:00:00Z`.
26. **Memory.** Chat history and provider memory files are not task memory. If it is not in Beads or Git, it does not exist.
27. **Commit each step.** Commit after each logical step with `wip(<task-id>): <step>`.
28. **Push.** Push the branch if a remote exists.
29. **Coordinator checkpoint.** If worker instructions reserve Git writes for the coordinator, request a checkpoint from the coordinator.
30. **No uncommitted long work.** Never leave work only in the working tree across a long operation.
31. **Lease.** The lease TTL is 5 minutes. Run `bd heartbeat <epic-id>` and `bd heartbeat <task-id>` at least every 4 minutes while you work, also during long actions. A lapsed epic lease lets any `bd reclaim` release the branch lock. Run `bd heartbeat <epic-id>` immediately before every commit and every push. If it fails, stop and write nothing. Heartbeat also fails when you no longer hold the task.
32. **Stale candidates.** Find quiet tasks with `bd list -l worktree:<folder> --status in_progress --updated-before <RFC3339 time 30 minutes ago> --limit 0`. This is a note-age filter only: heartbeats do not change `updated_at`, so a live agent can look stale there. The lease is the source of truth: read `lease_expires_at` in `bd show <id> --json`.
33. **Stale command.** `bd stale --days` is too coarse for a 5-minute lease. It counts whole days, and `--days 0` fails.
34. **Default takeover.** Run `bd reclaim --id <id> --older-than 0s`, then `bd update <id> --claim`. Reclaim refuses a live lease, so this cannot start a second writer. If reclaim prints "No stale leases", stop.
35. **Forced takeover.** Run `bd update <id> --assignee <me> --if-assignee <old> --if-status in_progress` ONLY with written coordinator approval in the task notes, after you confirm the old writer stopped. It succeeds even while the old lease is live. Never add `--force`: it cannot combine with `--if-assignee`.
36. **Guard failure.** Exit 13 means the guard failed and nothing was written. Stop and re-read the task. Do not retry with a new owner blindly.
37. **Heartbeat after takeover.** After a forced takeover run `bd heartbeat <id>` at once: the lease is the only proof of life. A task in_progress with no `lease_expires_at` cannot be reclaimed: ask the coordinator for a forced takeover. After the default takeover a heartbeat is still fine as a first refresh.
38. **Epic takeover.** Epic takeover uses the default takeover rule on the epic id. Do the epic first, then the tasks.
39. **Foreign replica leases.** Leases do not cross replicas when Dolt sync is used. Reclaim a foreign lease with `--any-replica` only when the granting replica is gone.
40. **Handoff note.** After a takeover, append `<UTC timestamp> handoff: from <old> to <me> reason: <why>`.
41. **Resume with the same branch.** Use the SAME worktree and branch, with any provider.
42. **Resume helper.** Start with `bash scripts/agent-resume.sh` (read only). It is the first action of a resume.
43. **Commit check.** Compare the `commit:` value of the last status note with the script's `commit OK` or `commit MISSING` result. Inspect `git status` and `git diff --stat`.
44. **Uncommitted changes.** Inspect each uncommitted change. Record in a task note whether to keep or discard it before you change it.
45. **Continue from next.** Continue from the last `next:` line. First re-run its `verify:` command.
46. **Closing.** Only the owner or coordinator closes an epic or task, after integration.
47. **Evidence before handoff.** Record verification evidence and the next step before handoff.

## Resume helper

`scripts/agent-resume.sh` needs Bash, Git and Python 3. It uses read-only Beads calls and never claims work.
It prints the local Git state, the branch mission and decision notes, and each in_progress task with its assignee.
It prints the current UTC time. Each Epic and Task header shows assignee, status and `lease_expires_at` with `(EXPIRED)` or `(LIVE)`. A missing lease on an in_progress item prints `none (NO LEASE: ask coordinator)`.
For each in_progress task it prints the last five notes, the last `next:` and `verify:` lines, and the commit check.
It prints the ready tasks of the branch.
It exits 2 outside a Git repository, for a detached HEAD or for a branch name with `,` or `"`.
If bd is missing, the script prints a recovery message and exits 0.
A missing epic prints a creation command for the coordinator.
Database or command failures return a nonzero exit code.
The sync baseline in `scripts/lvgs_cli/steps.py` includes the helper for projects.

## Related

- [AGENTS.md](../../AGENTS.md): Branches, verification and delivery.
- [Handoff skill](../../.agents/skills/handoff/SKILL.md): Entry point for a successor.
- [Decision template](../decisions/0000-template.md): Architectural decisions.
