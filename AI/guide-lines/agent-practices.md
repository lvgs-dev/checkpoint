---
name: agent-practices
description: Required rules for how agents write, verify, review and delegate code.
type: reference
area: guide-lines
---

# Agent practices

Start with [AGENTS.md](../../AGENTS.md). Read this file for every task that changes code. Each heading is a rule name.

## short-root-file

Keep `AGENTS.md` short. This template uses 80 lines as a project budget, not a researched limit. State only rules that an agent cannot find in the code or tools.
Do not add a repository overview. Add a rule only after an agent fails without it. Delete rules that no failure supports.

## critical-rules-first-and-last

Put the hard rules at the top of a file. Repeat the completion gate at the bottom.
Keep the total number of rules small. Move task-specific rules behind conditional links.

## conditional-context

Link a document only with a stated condition. Do not preload documents that the task does not need.
Point to files by path. Let the agent read them when needed.

## tests-first

Write a failing test before new behavior or a bug fix. Show that it fails. Then write the code.
Evidence is indirect: tests help code generation, but no source tests the red-before-green order. This order is project judgment.
Derive expected values from the spec, not from the code under test.

## external-feedback-only

Correct code from external signals: test output, compiler output, linter output, or a reviewer's quoted finding.
Do not ask an agent to "review and improve" its answer without such a signal.

## bounded-retries

Allow at most three repair attempts for the same failure. Then stop.
Record the failure, the evidence, and the next step as a blocker in the tracker.

## mechanical-architecture-checks

Express each architecture rule in the `Map` table as a lint rule, type rule, or test when a tool can check it.
Run these checks inside `<CHECK_COMMAND>`. Use prose only for rules that no tool can check.

## agent-friendly-commands

Give agents one gate command with short, specific output. Make errors say what to fix.
Prefer absolute paths and unambiguous flags in scripts. Never require interactive prompts.

## independent-review

Review non-trivial changes in a fresh context. Use a different model from the author when available.
Give the reviewer the spec, the diff, and the test output. Do not give it the author's reasoning.
Require each finding to cite a file, a line, and evidence. Ignore review length and finding order as quality signals.

## single-agent-default

Use one agent by default. Delegate only subtasks that are independent and touch different files.
Give each worker a written handoff: goal, acceptance criteria, owned files, and verification command.
Keep verification central: the coordinator re-runs `<CHECK_COMMAND>` on every worker result.

## Delegation hygiene

After `git add`, run `git status`. Ensure no tracked file remains unstaged.
A test file omitted from a commit cost two review rounds.
Workers validate with the tools on their PATH: node and pnpm, or python and pytest.
The orchestrator independently re-verifies before opening the pull request.
Give every worker a watchdog that reports completion with the exit code.
It must also report a dead process without a done file and silence beyond a defined timeout.
Inspect the diff before trusting a worker's account of its changes.
A worker can stop at a usage limit before it reports. Then no report exists: measure the real state of the tree with the gate and the checks, and finish the work or hand it to another worker.
A worker that cannot reach the container runtime cannot run the full gate. The orchestrator runs it and reads the result line before any commit.
A test never depends on a path, a user or a tool that exists on one machine only. It passes for its author and breaks on the CI runner. Read such a location from an environment variable and skip the test when the variable is unset.
A gate wrapper must return a non-zero exit code when a stage fails. A wrapper that hides failures behind a pipe reports success on a red build.
Use these checks with the [delegation rules](#single-agent-default) and [handoff format](#handoff-format).

## durable-mission-context

For claims, leases, step memory and provider takeover, follow the [Beads protocol](../architecture/beads.md).
For a successor session, use the [handoff skill](../../.agents/skills/handoff/SKILL.md).

## handoff-format

Require every worker report to state: result, changed files, exact commands with exit codes, blockers, and next step.
Store progress in the tracker, not in the chat.

## format-after-writing

Write the code first, then run the project `format` command. Do not spend effort on hand layout.
Run `format:check` in the gate. See [formatting](formatting.md) for the tools per file type.

## evidence-notes

- Treat rules in this file as defaults. Re-test them with your own tasks.

## Related

- [Practices index](index.md): Select more rules.
- [Role checklists](../jobs/index.md): Self-review gates.
