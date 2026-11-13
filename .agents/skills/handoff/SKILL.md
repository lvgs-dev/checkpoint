---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

For this repository, start with [AGENTS.md](../../../AGENTS.md). Load only guidance relevant to the assigned task.

In a repository that uses Beads, put durable state in Beads and Git. Follow the [Beads protocol](../../../AI/architecture/beads.md). A handoff file may only point to the epic id and the branch.

In a repository without Beads, write a handoff document summarising the current conversation so a fresh agent can continue the work. Save it to the temporary directory of the user's OS (`$TMPDIR`, else `/tmp`; `%TEMP%` on Windows), not the current workspace.

Include a "suggested skills" section in the document, naming which skills the next agent should call the Skill tool for.

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
