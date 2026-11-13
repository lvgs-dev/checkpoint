---
name: 0000-template
description: Template for a decision record (ADR). Copy it and number the copy.
type: decision
area: root
status: template
date: <YYYY-MM-DD>
task: <task id>
---

Start with [AGENTS.md](../../AGENTS.md).

Write one note for each main decision of your task. Name the file `<NNNN>-<slug>.md`.
Set `task` to the task id. Find task notes with `rg -l "^task: <id>$" AI/decisions/*.md`.
Task decision notes are temporary. Remove each task note before its branch merges into `<INTEGRATION_BRANCH>`.
Standing decisions have no `task` key. Keep them, even when other notes link to them.

# <NNNN> <Decision title>

## Context

<The forces and constraints. Two to five sentences.>

## Decision

- <What you chose, as short bullet points.>

## Alternatives rejected

- <Each rejected option and its reason.>

## Files

- <Each changed file and section.>

## How to verify

- <The command or test that verifies the decision.>

## Consequences

- <What becomes easier. What becomes harder.>

To change a decision, never edit this note. Create a new note that supersedes it. Set the old `status` to `superseded`.
