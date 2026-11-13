---
name: index
description: Table of role checklists. Pick the roles of your task and run each checklist before you report done.
type: hub
area: jobs
---

# Role checklists

Start with [AGENTS.md](../../AGENTS.md). Read this checklist only when its role applies to the task.

Each file is a self-review gate. Agents run the checklist of each role that the task touches. Most tasks touch more than one role.

1. Pick the roles from the table.
2. Open each file and answer every item.
3. Fix each no, then run the verification gate in `AGENTS.md` and report done.

| Role               | File                | When to use                                                                                                    |
| ------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Architecture       | `architecture.md`   | You change module boundaries, layers or data flow                                                              |
| QA and testing     | `qa-testing.md`     | You write or change tests, or fix a bug                                                                        |
| Security           | `security.md`       | You touch auth, input, secrets, uploads, dependencies, workflows, Compose, Environments, runners or Cloudflare |
| Docs and knowledge | `docs-knowledge.md` | You write or edit a note in `AI/`                                                                              |
| Code review        | `code-review.md`    | You review a change, yours or from another agent                                                               |

Add one file per extra role your project needs (for example frontend, database or DevOps).
Copy the front matter of an existing file. Add a row to the table.
