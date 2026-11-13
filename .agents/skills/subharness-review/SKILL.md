---
name: subharness-review
description: Audit, plan, apply, and verify documentation and subharness consistency after substantial changes. Use when reconciling docs with code, checking Obsidian vault integrity, validating links, or reviewing subharness boundaries.
---

# Subharness review

For this repository, start with [AGENTS.md](../../../AGENTS.md). Load only guidance relevant to the assigned task.

Audit documentation against code and repair confirmed differences.

## Scope

Select the relevant repository, domain, directory, skill, or task diff.
For agent guidance, include root entry files, repository skills, Beads hook text, and runtime prompt sources.

## Modes

- AUDIT: Inspect without editing. Report inaccurate facts, broken links, duplicate rules, and conflicting instructions.
- PLAN: Record the required work and dependencies through the canonical Beads workflow.
- APPLY: Make authorized changes in the assigned task branch and worktree.
- VERIFY: Check documentation integrity and run the repository verification gate.
- FULL: Run these modes in sequence. Integrate changes through a Pull Request targeting `<INTEGRATION_BRANCH>`.

## Procedure

1. Read the scoped documents and the source files that establish their facts.
2. Locate an existing documentation validator. Use it if available; otherwise, inspect links, frontmatter, paths, and commands directly.
3. Classify each finding as keep, update, consolidate, or remove. Record actionable work in Beads.
4. Apply authorized repairs using the documentation rules. Preserve existing owner changes.
5. Verify every changed link and instruction entry point. Confirm that conditional context links select the correct area.
6. Run `<CHECK_COMMAND>`. Record results and remaining blockers before delivery.

## Related

- [Documentation rules](../../../AI/guide-lines/documentation.md): Note format and link checks.
- [Beads workflow](../../../AI/architecture/beads.md): Canonical task ownership and commands.
- [AGENTS.md](../../../AGENTS.md): Branches, relevant context, and verification.
