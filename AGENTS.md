# Checkpoint agent guide

Start here. Read only the documents that apply to the assigned task.

The project will be renamed game-list.
The target deployment uses local PostgreSQL, one application container, and the Atlas delivery standard.

## Hard rules

1. Run `pnpm check` before you report completion. Report the command and its result.
2. Write a failing test before new behavior or a bug fix.
3. Work in an isolated branch and worktree from `origin/homologacao`. Deliver through a Pull Request.
4. Keep the change inside the task.
5. Never write secrets or personal data in files.
6. Write files in english.
7. Write short active sentences. One idea per sentence. This is a style preference, not a tested LLM-performance rule.
8. Do not format code by hand. Run the project `format` command after you write, then `format:check` in the gate. See [formatting](AI/guide-lines/formatting.md) and [agent practices](AI/guide-lines/agent-practices.md).

## Map

| Path                | What it is              | Rule                                           |
| ------------------- | ----------------------- | ---------------------------------------------- |
| `apps/api`          | Node API                |                                                |
| `apps/web`          | React app               |                                                |
| `packages/core`     | Domain contracts        | Both apps must pass checks after changes here. |
| `packages/ui-react` | Product-agnostic UI kit | Never import from `apps/*`.                    |

## Commands

```bash
pnpm install                       # after pulling or changing any package.json
pnpm test                          # all Vitest tests; DB tests skip until pnpm db:up
pnpm db:up                         # disposable PostgreSQL; pnpm db:down stops it
pnpm check                         # required gate: types, lint, formatting, tests and build
pnpm --filter <package> <script>   # run one package script
```

## Select task context

1. Follow the [Beads workflow](AI/architecture/beads.md) for every task, subtask, and epic. Beads remains mandatory.
2. Read the [agent practices](AI/guide-lines/agent-practices.md) for every task that changes code.
3. Select more rules from the [practices index](AI/guide-lines/index.md).
4. Select the current design from the [architecture index](AI/architecture/index.md).
5. For branches, CI/CD, environments or rulesets, read the [practices index](AI/guide-lines/index.md) delivery rules.
6. Run the checklists of the [role index](AI/jobs/index.md) before you report completion.

To resume work, run `bash scripts/agent-resume.sh` (see the [Beads workflow](AI/architecture/beads.md)).

Follow a link only when its stated condition applies. If a practice conflicts with the code, report the difference.

## Work loop

1. Claim the task. Read the context above.
2. Write the failing test. Write the smallest change that passes it.
3. Run `pnpm check`. Fix failures from the tool output. See bounded retries in the agent practices.
4. Review the diff with the role checklists. Ask an independent reviewer for non-trivial changes.
5. Update the affected `AI/architecture/` notes in the same task.

Delegate only when the agent practices allow it. Coordinators read [orchestration](.agents/orchestration.md).

## Where knowledge goes

- The tracker stores tasks, dependencies, blockers, and progress.
- Git stores source, history, branches, and worktrees.
- Keep Markdown files under `AI/`. Exceptions: `README.md`, `AGENTS.md`, `CLAUDE.md`, `.agents/`, and the `.github/` PR template.
- Record decisions with the [decision template](AI/decisions/0000-template.md). Never create report files; put reports in your final message.

## Skills

Read applicable skills from `.agents/skills/<name>/SKILL.md`. Report a missing skill. Do not invent its rules.

- Code changes: `ponytail`. Features and bug fixes: `tdd`. Reviews: `code-review`.
- Documentation checks: `subharness-review`. Session handoff: `handoff`.
- Existing-repository harness setup/sync/pruning: `start-ai-setup`. CI/CD for a new project on Atlas: [new project roadmap](AI/guide-lines/new-project-roadmap.md). Another host or unknown infrastructure: `deploy-script-and-needs`. The roadmap wins on any conflict.
- Project delivery standard: use the thin workflow and pinned shared engine. Never copy engine scripts into projects. Read [CI and CD](AI/guide-lines/ci-cd.md) for release and runner access rules. Bootstrap usage is in `start-ai-setup`.

## Before you report done

1. Did `pnpm check` pass? Quote its result.
2. Did a failing test come first? Did a checklist pass?
3. Report changed files, verification results, and blockers.
