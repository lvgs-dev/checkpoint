---
name: architecture
description: Self-review checklist for the architecture role. Use it before you report a task done.
type: reference
area: jobs
role: architecture
---

# Architecture checklist

Start with [AGENTS.md](../../AGENTS.md). Read this checklist only when its role applies to the task.

Answer every item with yes, no or not applicable. Fix each no before you report done.

## Before

- [ ] Did you read `AI/architecture/index.md` and the relevant architecture guides and the decision notes in `AI/decisions`?
- [ ] Do you know which module owns the change?

## During

- [ ] Does each module expose a small interface and hide its internals?
- [ ] Does data flow in one direction between layers?
- [ ] Does the change reuse an existing module instead of adding a parallel one?
- [ ] Does each architecture rule of the change have a mechanical check (lint, type or test)?
- [ ] Does a script enforce each restriction, not only a sentence in a note?

## Before you report done

- [ ] Did you record each main decision in a decision note?
- [ ] Do the references in `AI/architecture` still match the code?
