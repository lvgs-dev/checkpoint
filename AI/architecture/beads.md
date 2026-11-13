---
name: beads
description: Task tracking workflow with Beads (bd). Replace it if you use another tracker.
type: reference
area: architecture
---

# Beads workflow

Start with [AGENTS.md](../../AGENTS.md). This file is the only source for tracker rules.

## Workflow

1. Run `bd ready`. Inspect selected work with `bd show <id>`.
2. Create missing tasks with `bd create`. Put the branch name in the title or notes.
3. Track dependencies with `bd dep add <dependent> <prerequisite>`.
4. Claim the task with `bd update <id> --claim`.
5. After each step, update notes with `status:`, `branch:`, `next:`, and `blocker:`.
6. Create a bug task for each failure you find. Add `--deps discovered-from:<task-id>`.
7. Record verification evidence before you hand off.

## Rules

- Use command flags. Never run interactive `bd edit`.
- Use priorities 0 through 4. Priority 0 is highest.
- Keep progress in the tracker, not in Markdown task lists.
- Share one Beads database across Git worktrees. Do not create one per worktree.
- Only the owner or the coordinator closes a task, after integration.

## Related

- [AGENTS.md](../../AGENTS.md): Branches, verification, and delivery.
