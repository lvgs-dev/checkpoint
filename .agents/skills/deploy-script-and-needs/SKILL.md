---
name: deploy-script-and-needs
description: Turn an existing local application repository into a secure, repeatable GitHub CI/CD deployment, with a complete dependency-ordered Beads plan, server/container prerequisites, Cloudflare DNS/Tunnel/Access, health checks and rollback.
---

# Deploy script and needs — end-to-end deployment orchestrator

> **Precedence.** For `lvgs-dev` projects on Atlas, `AI/guide-lines/new-project-roadmap.md` and the notes it links are the standard (`homolog` then `main`, build once, promote the same digest by retagging the registry manifest, call the central `ci-workflows` engine pinned by the 40-hex sha of a release tag, Atlas runner group lists the reusable `deploy.yml` at that sha). Where this file differs, those notes win. Use this file only for a host that is not Atlas, or when the owner asks for it.

Use when the owner asks what is needed to deploy a repository, to build a complete CI/CD plan, or to implement automated deployment from local code to hosted containers and a public domain.

**Mandatory companion:** [DEPLOY-CHECKLIST.md](DEPLOY-CHECKLIST.md). It is the exhaustive task inventory and acceptance matrix. Read it before creating Beads tasks. This skill is a **workflow prompt**: it tells the receiving agent to investigate the actual project, create a complete executable plan in Beads, implement what it safely can, and guide the owner through human-only configuration.

## Invariants

1. Never imply a standard architecture fits every repository. Audit the real source, tests, data stores, hosting, cloud accounts, host OS, domains and constraints first. The example home-lab mapping "build host → registry → application host" is an option, not a universal fact.
2. **Do not make direct changes to production servers, registrars, DNS, Cloudflare, billing, GitHub organization policy, credentials, backups or existing deployments without explicit authorization.** Prepare safe commands and ask the owner to execute human-only steps. Treat any separate explicit permission narrowly.
3. Build and deploy are separate trust boundaries. CI tests and builds untrusted code; CD receives only an authenticated, approved artifact. Never grant PR code deployment keys, production secrets, Docker socket access or broad host privileges.
4. Never expose databases directly to the Internet. Use private container networks, private interfaces, explicit source allowlists, strong credentials and minimal database roles. A Docker port mapping can bypass simple host firewall rules: verify DOCKER-USER/nftables packet path or a supported equivalent, and test both allowed and denied peers.
5. No destructive data migration, volume deletion, irreversible schema change, DNS cutover or live service replacement without a tested recovery plan and the owner's approval. Rollback of an image does not reverse database changes.
6. Preserve existing owner changes, Compose stacks, PostgreSQL volumes, public domains, Cloudflare connectors and Git worktrees. Inspect whether resources exist before creating duplicates. No git clean -fdx, docker compose down -v, plaintext secrets in logs, or guessing addresses/tokens.
7. Do not invent job names, models, tool capabilities, hostnames, ports, availability, CI successes or installation results. State unknowns. Ground exact commands in the detected OS/tool versions and verify the command options.
8. Keep steps short and operator-friendly: label the host/platform for **every** command, state expected output, state whether the step is read-only or mutating, state rollback when relevant. Avoid one giant script pasted into an unfamiliar shell.
9. Never mark a Beads task complete from a plan alone. Every task needs verifiable evidence and a human gate where required.

## Orchestration policy

- Main agent is a coordinator: maintains the DAG and small task summaries, communicates with owner, and makes decisions. Do not fill coordinator context with entire source files, raw logs or large diffs.
- If subagents really exist, delegate parallel **read-only** investigators: source/tests, infrastructure/hosts, security/network, GitHub/registry, Cloudflare/domain, databases/migrations, operations/cost. Use inexpensive capable models with low reasoning for discovery and small implementation; use independent stronger reviewers for architecture, security and release gates.
- Investigators write concise evidence with source paths, current-vs-desired state, prerequisites, blockers and suggested tasks. Coordinator consumes summaries.
- Break implementation into independently testable jobs (prefer <=4 human-hours), disjoint branches/worktrees/files, clear acceptance criteria and bounded retries. Workers implement, test and commit in isolation; another agent reviews. No worker self-approves.
- If genuine subagents are unavailable, state the limitation and perform phases sequentially rather than claiming parallel execution.
- Follow [Orchestration](../../orchestration.md), [Beads workflow](../../../AI/architecture/beads.md), and applicable security/QA/architecture job checklists.

## Phase 0 — user intent and current-state audit (read-only)

Inventory at minimum:

- Application architecture: repo/monorepo, services and dependencies, language/runtime, package manager/lockfile, build/test commands, health endpoints, ports, startup entry points, migrations, background workers, recurring jobs, external integrations and stateful storage.
- Repository/GitHub: owner/org and visibility, default/integration branches, rulesets, PR checks and exact check names, current secrets, Actions permissions, reusable workflows, runner labels/trust, GHCR package permissions, current images and tags.
- Hosts: OS/version, CPU/RAM/disk, DNS/network, static LAN IPs, SSH users, sudo groups, Docker/Podman/Compose versions, firewall, persistent storage, service manager, clock, network access from CI runner and application host. If host access is not allowed, provide small read-only discovery commands for the owner.
- Dependencies: existing PostgreSQL/other databases and versions, credentials/roles, schema, migrations, data volumes, cache, queue, object storage and data retention requirements. Decide **per project** whether DB is private to application or shared service, rather than assuming one database container per code repository.
- Cloudflare/domain: account/zone, nameservers and Active status, ownership, available hostname, existing tunnel and connector topology, routes, DNS conflicts, Access policies/identity providers, inbound ports, application auth, TLS needs.
- Security/reliability: secrets at rest/in transit, PR trust, backup/recovery, release approval, rollback, health probes, logs, alerting, capacity and budget.

Collect only necessary missing details. Ask one short question or a compact operator checklist only when the answer actually blocks a task; otherwise continue safe read-only work and register explicit assumptions in Beads.

## Phase 1 — architecture and Beads as the source of truth

1. Produce a short, evidence-backed "current → target" architecture and release sequence: dev → PR → CI gate → protected branch → immutable image/digest in registry → restricted deploy → migration gate → health validation → traffic → rollback/monitoring.
2. Compare appropriate hosting options. Explain tradeoffs for build host vs deploy host, isolated vs shared database, rootless build, direct SSH vs private overlay, and Cloudflare Tunnel vs other ingress. Choose the least complex workable design.
3. Adopt the full [DEPLOY-CHECKLIST.md](DEPLOY-CHECKLIST.md) as a baseline. **Create actual Beads epics and tasks** with dependencies using the installed bd CLI and existing tracking conventions; tailor conditional steps instead of silently discarding them.
4. Every task includes: title, category, host/platform, worker/human owner, prerequisites, exact deliverable, acceptance test, failure/rollback plan, security considerations, status, branch/worktree when coding, and next action.
5. Use bd ready, bd show, bd create, bd dep add and bd update --claim **only after checking installed syntax and existing tracker policy**. Share the existing Beads DB between worktrees. If bd is absent, explain and offer installation/instructions; save a draft outside the repo until the tracker is available. Do not pretend tasks were created.
6. Model human-only steps as explicit **blocked Beads tasks with instructions**, never as "completed" work. Include DNS delegation, cloud account setup, billing, access policy choices, human credentials, router reservations and approval of deploy.
7. Create dependencies and gates before implementation. Record the mapping from checklist IDs to actual Beads IDs in task descriptions/notes, not a competing task tracker.

## Phase 2 — implement in small jobs

Use the checklist order. Implement only scoped changes whose prerequisites are fulfilled:

- Add reproducible environment templates, version constraints, build/test commands, Dockerfile(s), .dockerignore, least-privilege runtime user, health/readiness endpoints, Compose overlays and explicit migration command.
- Add automated unit/integration tests, typecheck, lint, build, container smoke test and security scanning where suitable. CI must run on PRs and main, with exact stable job names for required status checks.
- Package OCI images tagged with commit SHA and deploy by digest. Build and publish only from trusted refs after tests pass. Default GITHUB_TOKEN to minimal permissions; use GitHub Packages auth where sufficient. Keep BuildKit secrets out of build layers and logs; do not assume GitHub PAT is always needed.
- Configure a separate CD authorization path. On a trusted main release, deploy only the approved image to the intended host through restricted SSH/private network/approved mechanism. Do not add CI runner to docker group or expose Docker TCP/socket to untrusted workloads.
- Generate or adapt concise, idempotent, reviewable scripts such as scripts/ops/preflight.sh, scripts/ops/deploy.sh, scripts/ops/health.sh and scripts/ops/rollback.sh **inside the target project, not in Subharness**. Their exact paths and language depend on that project.
- Deploy must use a deployment lock, validate target/image digest/allowlisted repository, record current and previous image, prepare permissions/migrations, pull and start only intended services, wait for readiness, verify from both host and public route, and revert application image if checks fail. For stateful or irreversible migrations, stop rather than claim safe automated rollback.
- Avoid accidental recreation of DB/queue volumes. Compose up -d --no-deps for app-only replacement when appropriate; use Compose profiles/overlays correctly and test the effective merged config.
- Keep infra credentials on the destination secret store with least privilege. Record the owner-controlled steps for setting GHCR pull credentials, rotating them, and using credential helpers/encrypted storage when available.

## Phase 3 — human-guided platform configuration

Prepare exact operator steps for the chosen environment, identifying the platform for each:

- GitHub: organization/repository access, runner registration/labels, fork/PR trust controls, Actions secret/variable scopes, GITHUB_TOKEN permissions, GHCR package access, branch ruleset for the real default branch, required check names, merge policy and deployment environment approval if used.
- Build host: service account permissions, rootless builder storage/runtime and subordinate IDs if using Podman, package/cache setup, memory/disk/concurrency limits, build/push test to registry.
- Deploy host: SSH restricted identity, authorized key/forced command or suitable least-privilege remote mechanism, daemon and Compose, network, disk/volume permissions, pull-only registry credential, deploy script and health checks.
- Databases and dependencies: separate roles/secrets/volumes, least-privilege migrations, internal reachability, LAN-only exposure if truly required, verify firewall allow/deny, data upgrade strategy and recovery testing.
- Cloudflare: zone/nameserver activation, tunnel inventory and connector health, single tunnel reused or new tunnel explicitly justified, published hostname → service route, DNS verification, Cloudflare Access or application authentication **before** treating hostname as private, TLS, public health probe, and fallback procedure. Never copy an existing connector token into repo or start duplicate connectors casually.
- Operator recovery: backup retention and restoration exercise based on data value and risk, alerts, monitoring, logs, image pruning policy, secret expiration/rotation, capacity and monthly costs.

Every human action must state exactly _where to click or run_, its expected result, how to validate, and what evidence (not credentials) the user should report.

## Phase 4 — verification and release gates

Execute independent reviews and record evidence for:

1. CI on a representative PR: tests, typecheck, build, container startup and dependency checks.
2. Protected branch: enforce no direct push, no merge without required checks; check actual ruleset enforcement and bypass actors rather than only a checkbox.
3. Package registry: versioned image and digest available, build provenance or signed attestation when feasible, private pull from deploy host with minimal read access.
4. Network: web origin private behind tunnel, required public route functional, authentication/access policy tested, DB and SSH inaccessible from unauthorized origins.
5. Database: migrations on disposable production-version DB with legacy schema, scoped role privileges, persistence and idempotent startup; no unplanned destructive operations.
6. Deploy rehearsal: version N → N+1, health succeeds, no stateful service replacement, release evidence recorded, deliberately broken image causes rollback, app remains available. Don't run live failure injection without explicit approval.
7. Incident operations: log review, rollback, redeploy, restoring backup (in isolated environment), token rotation and lost-host recovery are documented and testable.
8. Human approval: if production changes are required, present a concise change plan (commands, risks, downtime, rollback, verification) and await explicit approval.

Mark completed tasks only with concrete command/test evidence. Create follow-up Beads for failures, blocked dependencies or deferred controls. Never convert unknowns into implied success.

## Deliverables

Provide in the **target repository**:

- A project-specific CI/CD architecture and preflight checklist.
- Actual populated Beads epics/tasks/dependencies/human gates.
- CI workflows, container files, deploy/rollback/health scripts and environment examples as needed.
- Cloudflare/DNS/Access instructions matched to the target domain and topology.
- Database and firewall setup/verification guidance, including a secure template for another application/DB.
- A short operator runbook with labeled host commands, release procedure, rollback and known risks.
- Independent review evidence, test results and PRs; no main merge or live deployment without approval.

## Completion response

Report: chosen architecture; target repo and branches; Beads epic/task IDs with ready/blocked/done counts; generated script paths; exact CI gates; image registry path and release trigger; Cloudflare/DNS/Access state; DB/host separation; tests and reviews with actual outcomes; remaining human tasks; release readiness (READY / BLOCKED, with reasons). Never claim deployment succeeded if it was merely planned.

## Related

- [Complete task inventory](DEPLOY-CHECKLIST.md): required Beads work packages and acceptance tests.
- [Beads workflow](../../../AI/architecture/beads.md): tracker policy.
- [Security role](../../../AI/jobs/security.md): security checks.
- [Architecture role](../../../AI/jobs/architecture.md): system boundaries.
- [QA role](../../../AI/jobs/qa-testing.md): verification.
