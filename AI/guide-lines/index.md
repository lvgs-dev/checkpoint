---
name: index
description: Select development practices for the task.
type: hub
area: guide-lines
---

# Development practices

Start with [AGENTS.md](../../AGENTS.md).

- Every code task: read [agent practices](agent-practices.md).
- Every task that writes documents: read [documentation rules](documentation.md).
- Every task that changes branches, CI/CD, environments, rulesets or deploy: read the delivery standard:
  [branches and naming](branches-and-naming.md), [CI and CD](ci-cd.md), [environments and secrets](environments-and-secrets.md), [branch protection](branch-protection.md).
- Every task that creates a new project with CI and CD, or that explains the infrastructure: read [the new project roadmap](new-project-roadmap.md).
  Then read [compose and Dockerfile](new-project-compose-and-dockerfile.md), [workflow and scripts](new-project-workflow-and-scripts.md), [security and access](new-project-security-and-access.md), and [the traps](ci-cd-traps.md) when the phase needs them.
- Every task that runs or changes the `lvgs` command or syncs the guidelines into a project: read [the lvgs command](lvgs-command.md).
- Every task that sets up or checks the disposable homolog environment: read [the homolog VM](homolog-vm.md).

- Every task that starts a React frontend: read [start a React frontend](frontend-start-react-app.md) first.
- Every task that writes or changes React screens: read [thin React applications](frontend-thin-app.md).
- Every task that builds, changes or reviews a screen or dashboard: read the [UI design standard](ui-design-standard.md).
- Every frontend task that builds, changes or reviews responsive behaviour: read [responsive design](responsive-design.md).
- Every task that adds or changes fetching, caching, loading states, polling or live updates in a UI over an API: read [data freshness](data-freshness.md).
  Then read [frontend data and loading](frontend-data-and-loading.md) when you edit the client, and [backend realtime and caching](backend-realtime-and-caching.md) when you edit the server.
- Every task that defines measured values, units or precision: read [units and measures](units-and-measures.md).
- Every task that displays, charts or edits measured values in a UI: read [frontend units and measures](frontend-units-and-measures.md).
- Every task that stores, collects or serves measured values: read [backend units and measures](backend-units-and-measures.md).
- Add one file per area of your project (for example frontend or backend). Link it here with a condition.

Practices state required rules. Architecture notes describe what the code does now.

## Related

- [Architecture index](../architecture/index.md): Current implementation guidance.
