# Deployment task matrix — mandatory Beads baseline

> **Precedence.** For `lvgs-dev` projects on Atlas, `AI/guide-lines/new-project-roadmap.md` and the notes it links are the standard (`homolog` then `main`, build once, promote the same digest by retagging the registry manifest, call the central `ci-workflows` engine pinned by the 40-hex sha of a release tag, Atlas runner group lists the reusable `deploy.yml` at that sha). Where this file differs, those notes win. Use this file only for a host that is not Atlas, or when the owner asks for it.

Read [SKILL.md](SKILL.md) first. This file provides a **complete, dependency-ordered starting inventory**, not a claim that each environment needs every component. The coordinator must investigate the target, create actual Beads epics/tasks, tailor conditional jobs, add dependencies, and record why an item is not applicable. Do not replace Beads with this Markdown checklist.

## Task record contract

For EVERY task: record logical ID, real Beads ID, phase, priority (P0 critical → P4 low), owner (agent/human), platform/host, exact files or control plane, prerequisites, acceptance checks, failure/recovery path, secret sensitivity, output/evidence, status and next action. Keep executable jobs small (prefer <=4h). Create a new task if one job grows too large.

Use bd help for installed syntax. Read existing tasks before creating duplicates. Dependencies use bd dep add <dependent> <prerequisite>. When Beads cannot be used, report BLOCKED and prepare an offline draft, but never claim tasks exist.

Codes: **H** = user/platform administrator action; **A** = agent can implement or verify in allowed workspace; **C** = conditionally applicable; **R** = requires independent review.

## Epic 0 — discovery and architecture (all later epics depend on this)

| ID  | Depends on      | Owner | Task / acceptance evidence                                                                                                                           |
| --- | --------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01 | —               | A     | Identify target repository, current branch, upstream, dirty state, Git worktrees, owner and permissions; no owner changes lost.                      |
| D02 | D01             | A     | Inventory source language, package manager/lockfile, monorepo apps, entry points, ports, services, jobs and runtime versions.                        |
| D03 | D01             | A     | Inventory existing CI, status-check names, rulesets, review requirements, Actions permissions and runner topology.                                   |
| D04 | D01             | A     | Inventory databases, schemas, migrations, volumes, queue/cache/object store, backup approach and persistence requirements.                           |
| D05 | D01             | A/H   | Inventory every target host: OS, CPU/RAM/disk, LAN address, routes, SSH, firewall, container engine and account privileges using read-only commands. |
| D06 | D01             | A/H   | Inventory DNS registrar, Cloudflare zone and nameservers, tunnel connectors/routes, existing Access policy, public URLs and cert setup.              |
| D07 | D02,D04,D05,D06 | A/R   | Write trust/data-flow diagram, threat model, cost/capacity estimate and selected hosting design. Record accepted alternatives.                       |
| D08 | D03,D07         | A     | Define release contract: PR → CI → protected main → immutable image → limited CD → health → rollback. Identify human gates.                          |
| D09 | D02,D08         | A     | Create real Beads epics/tasks and dependency DAG from the entire matrix; record ID mapping and conditional omissions.                                |
| D10 | D07,D09         | H     | Owner approves architecture and any planned new servers, cloud spending, migrations, host changes or public exposure. Remain blocked until approved. |

## Epic 1 — application readiness

| ID  | Depends on | Owner | Task / acceptance evidence                                                                                                                                |
| --- | ---------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | D02,D08    | A     | Reproducible dependency installation; pin runtime, use lockfiles, test from clean checkout.                                                               |
| A02 | A01        | A/R   | Unit tests for core behavior, deterministic isolated fixtures, clear test command and passing output.                                                     |
| A03 | A01        | A     | Lint/typecheck/static validation with stable CI job names and actionable output. Mark N/A only with evidence.                                             |
| A04 | A01        | A     | Build frontend/backend artifacts; verify served paths, assets, runtime configuration and no development dependencies in runtime.                          |
| A05 | A04        | A/R   | Minimal OCI Dockerfile(s), multi-stage where useful, .dockerignore, non-root runtime, pinned supported base and no embedded secrets.                      |
| A06 | A04        | A     | GET readiness/liveness (or equivalent), graceful shutdown, process signal handling and application logs. Differentiate DB unavailable vs app unavailable. |
| A07 | A05,A06    | A/R   | Smoke-test image startup with throwaway dependencies: health, API, UI/assets, environment validation and graceful stop.                                   |
| A08 | D04,A05    | A     | Specify process roles and replicas (API, queue worker, scheduler, collector); avoid duplicate polling or jobs when scaled.                                |
| A09 | A07,A08    | A     | Add repeatable local Compose/dev/test setup for disposable test dependencies and a safe env example.                                                      |

## Epic 2 — hosts, connectivity and runtime

| ID  | Depends on | Owner | Task / acceptance evidence                                                                                                                          |
| --- | ---------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| H01 | D05,D10    | H     | Approve machine placement and host aliases; verify hostname, interface, fixed IP/reservation, route and DNS name.                                   |
| H02 | H01        | H     | OS updates, maintained kernel, time sync, power/suspend behavior, resource monitoring and disk/storage mount verification.                          |
| H03 | H02        | H     | Provision service accounts, locked-down SSH keys, sudo boundaries, disabled unnecessary remote login; record key recovery path.                     |
| H04 | H03        | H     | Install/verify Docker Engine + Compose plugin on deploy host; confirm root-equivalent Docker group risk and chosen permissions.                     |
| H05 | H02        | H     | Install/check rootless Podman or approved builder on build host; validate subuid/subgid, session runtime, storage and unprivileged build.           |
| H06 | H03        | H/R   | Verify private host-to-host SSH, LAN or overlay connectivity with only approved ports; distinguish internet egress from inbound access.             |
| H07 | H04,D07    | A/H   | Define resource budgets and per-service limits, container restart policy, persistent paths, logging rotation, disk cleanup boundaries.              |
| H08 | H04,H06    | H/R   | Firewall baseline: deny unnecessary inbound; allow only required LAN peer/source; test allowed AND denied origins; inspect Docker-forwarding rules. |
| H09 | H05,H07    | H     | Validate build runner memory/disk/concurrency with image build; prevent OOM from concurrent jobs and uncontrolled cache growth.                     |

## Epic 3 — databases and stateful services

| ID  | Depends on  | Owner | Task / acceptance evidence                                                                                                                             |
| --- | ----------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B01 | D04,D07,D10 | A/R   | Decide: independent DB per app vs shared DB server; document isolation, version, ownership, latency and blast radius.                                  |
| B02 | B01,H04     | A     | Define Compose DB/queue/cache services only when needed; named persistent volumes, internal networks, health checks, restart policy and versions.      |
| B03 | B02         | A/R   | Keep DB private by default. If cross-host connection is required, explicit private-interface binding, source firewall allowlist and TLS/auth decision. |
| B04 | B01         | A/H   | Create per-app database/users with separate migration vs application roles; least-privilege grants for existing/new tables and sequences.              |
| B05 | B02,B04     | A/R   | Create versioned migrations, explicit administrative migration command, baseline for existing schema, repeat-run idempotence and rollback policy.      |
| B06 | B05         | A/R   | Test migrations using disposable database of same major/version and legacy data, including failure injection and data preservation.                    |
| B07 | B02         | H/R   | Choose backup retention/storage and run a non-production restore drill. If owner defers, mark risk and do not perform destructive migration.           |
| B08 | B03,B04,H08 | H/R   | Verify authorized app/worker connectivity and unauthorized rejection from a different machine; verify no public DB exposure.                           |
| B09 | B04,B06     | A     | Validate app starts using restricted runtime role; migration admin role not required at normal boot.                                                   |
| B10 | B07         | A/H   | Document recovery for DB outage, volume full, credentials rotation, corrupted data and major-version upgrades.                                         |

## Epic 4 — GitHub, CI and protected branches

| ID  | Depends on      | Owner | Task / acceptance evidence                                                                                                                        |
| --- | --------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01 | D03,D08         | A/H   | Select GitHub org/repo, branch naming and trusted PR policy; verify Actions entitlement and self-hosted runner exposure.                          |
| C02 | C01,H05,H09     | H     | Install/register runner only on trusted execution host; correct labels, dedicated account, service persistence and update policy.                 |
| C03 | C01,A02,A03,A04 | A     | CI workflows on PR/main with checkout, unit tests, typecheck/lint and build, pinned/approved actions and fixed check names.                       |
| C04 | C03,B06         | A/R   | Integration tests using disposable DB/service dependencies; no production DB, network service or private customer data.                           |
| C05 | C03,A05,A07     | A/R   | OCI image build smoke-test from project source; use BuildKit/Podman secrets, validate full runtime, inspect image for leaked tokens.              |
| C06 | C03             | A/R   | PR safety: exclude untrusted forks from persistent self-hosted runners where applicable, minimize permissions, no production secret in PR jobs.   |
| C07 | C03,C04,C05,C06 | H/R   | Configure branch ruleset for actual main: PR required, no force push/deletion, required checks with EXACT context/source, bypass actors reviewed. |
| C08 | C07             | A/H   | Confirm ruleset enforced (not evaluate-only), direct pushes disallowed, merge with missing checks blocked, and expected job passes correctly.     |
| C09 | C03             | A     | Document local single-command equivalent of CI gate and per-job commands for debugging.                                                           |
| C10 | C05             | A/R   | Dependency/secrets/IaC scanning and supply-chain risk triage; record justified findings rather than silently ignoring them.                       |

## Epic 5 — registry and artifact promotion

| ID  | Depends on | Owner | Task / acceptance evidence                                                                                                                 |
| --- | ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| R01 | C05,C06    | A/H   | Choose registry (GHCR if GitHub), image namespace, package visibility, repo association, access scopes and retention limits.               |
| R02 | R01        | A     | Build on trusted main/release event only after required tests pass; version by full commit SHA and capture immutable digest.               |
| R03 | R02        | A/R   | Push using least-privilege temporary credentials; avoid PAT if GITHUB_TOKEN suffices; no token in layer, build log or PR.                  |
| R04 | R03,H04    | H/R   | Provide deploy host pull-only registry authentication through approved local secret store; verify image pull without showing credential.   |
| R05 | R03        | A     | Record release manifest: source commit, test run, image digest, build metadata and deployment state.                                       |
| R06 | R05        | A/R   | Optional supported artifact provenance, SBOM/signatures and image vulnerability scanning if risk warrants; do not claim without verifying. |

## Epic 6 — Cloudflare, domain, DNS, ingress and Access

| ID  | Depends on  | Owner | Task / acceptance evidence                                                                                                                                                                                    |
| --- | ----------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01 | D06,D10     | H     | Domain ownership/registrar access verified; nameservers correctly delegated; Cloudflare zone **Active**.                                                                                                      |
| F02 | F01         | H     | Choose exact hostname, subdomain, environment and application URL; inspect existing A/AAAA/CNAME records and conflicts.                                                                                       |
| F03 | F02,H04     | A/H   | Inventory existing cloudflared connectors, tunnel IDs, routes, network mode and other hosted apps; reuse where feasible.                                                                                      |
| F04 | F03         | H     | Create a new Cloudflare Tunnel ONLY if justified, else reuse existing. Install/register connector using official dashboard workflow; store token privately; ensure single intended connector/redundancy plan. |
| F05 | F04,H08     | H/R   | Connect cloudflared to the origin by actual reachable address/container network. Verify from connector namespace, not simply from host.                                                                       |
| F06 | F02,F05     | H     | Configure Published application route (hostname, domain, Service URL and protocol). Confirm DNS record is created or create correct CNAME to tunnel, without conflicting records.                             |
| F07 | F06         | H/R   | Configure Access application with intended identities/MFA or verify application-native auth before public exposure. Test unauthorized vs authorized visits.                                                   |
| F08 | F06,F07     | H/R   | Verify edge TLS/certificate and correct HTTPS; if origin HTTPS, validate cert and Origin Server Name rather than disable verification.                                                                        |
| F09 | F06,F07,F08 | A/H   | Verify external name resolution, HTTPS route, expected UI/API/health and non-public origin. Check Cloudflare errors and response headers without leaking tokens.                                              |
| F10 | F09         | A/H   | Document tunnel connector outage/restart, route rollback, DNS rollback and steps for adding next hostname on same tunnel.                                                                                     |

**Cloudflare operator sequence (do not skip):** register/verify domain → update nameservers at registrar if necessary → wait for zone Active → inventory existing tunnels and DNS → create/reuse tunnel → connector online (outbound connectivity, including port 7844 if needed) → verify origin reachability → create Published application route and corresponding DNS → configure Access/auth → test public HTTPS AND unauthorized denial. A tunnel route alone is not authentication. Do not expose internal DB or Docker endpoints via HTTP routes.

Use current official UI names. Starting point: https://developers.cloudflare.com/tunnel/get-started/ and https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/.

## Epic 7 — CD, restricted deploy, migration and rollback

| ID  | Depends on      | Owner | Task / acceptance evidence                                                                                                                                   |
| --- | --------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P01 | D08,H03,R05     | A/R   | Define deploy authority, environment promotion (main vs release), trusted trigger, idempotence and concurrency lock.                                         |
| P02 | P01,H06         | A/H/R | Restricted SSH/overlay or controlled deployment agent: deploy identity cannot run arbitrary privileged commands or write secrets.                            |
| P03 | P01,R05,R04     | A     | Generate target-project preflight script: validates env, approved digest, host, running stack, dependencies, free disk and DB reachability.                  |
| P04 | P03,B05,B06     | A/R   | Explicit admin migration step before rollout, compatible expand/contract scheme changes, no unreviewed down migrations; production approval gate.            |
| P05 | P03,H04         | A/R   | Generate deploy script: lock → record prior digest → pull approved immutable digest → update only application service → verify health and exit status.       |
| P06 | P05,A06         | A     | Generate health script: local readiness, API/UI, dependency reachability, bounded retries/timeouts and outward route check when appropriate.                 |
| P07 | P05,P06         | A/R   | Generate rollback script: restore previous **application image**, retain volumes/config, verify health. Flag irreversible schema changes as manual recovery. |
| P08 | P04,P05,P06,P07 | A/R   | Dry-run scripts in disposable environment; normal release, repeated release, failure, timeout, concurrency, wrong digest and recovery.                       |
| P09 | P08,C07,R03     | A/R   | GitHub CD workflow on trusted approved main/release only; deploy secret only in restricted job/environment, no PR access.                                    |
| P10 | P09             | H/R   | Configure GitHub environments, permissions, reviewer approval if needed, deploy secrets and allowed branches; validate actual restrictions.                  |
| P11 | P09,P10,F09,B08 | H     | Present exact production release plan with host-specific commands, expected results, risk and rollback. **Stop for approval**.                               |
| P12 | P11             | H/R   | Authorized first deploy, record digest and health state, confirm no DB volume recreation, confirm public route and collector/worker singularity.             |
| P13 | P12             | A/H   | Test second version and redeploy of same digest in a safe window; verify zero unintended changes and documented outage behavior.                             |

**Deploy script required properties:** fail closed on malformed image references, verify allowlisted repository and digest, avoid executing attacker-controlled tags/commands, no mutable latest, no broad sudo, never overwrite .env or secrets, never bring down an unrelated Compose project, no global prune, time-bound probes, release lock, evidence for previous version, and a reviewed way to revert only app containers. DB rollback is a separate procedure.

## Epic 8 — observability, maintenance and repeatability

| ID  | Depends on      | Owner | Task / acceptance evidence                                                                                                                                                                |
| --- | --------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O01 | A06,H07         | A/H   | Application/host/DB/tunnel health metrics, logs and disk/capacity monitoring; distinguish a stale sample from an alive process.                                                           |
| O02 | O01             | H     | Configure actionable notification route for health, disk, TLS/tunnel, CI and deployment failure; test one alert.                                                                          |
| O03 | R03,H07         | A/H   | Safe log/image/build-cache/registry retention, bounded by disk quota and ensuring active/previous versions remain available.                                                              |
| O04 | B10,P07,F10     | A     | Operator runbook: install, test, start/stop, deploy, DB migrations, rollback, restore, Cloudflare route, secrets rotation, incident response.                                             |
| O05 | O04             | A/H   | Fresh-project recipe: unique Compose project/hostname/domain, isolated ports/networks/volumes/DB roles, reusable workflows, runner capacity and secrets, no conflicts with existing apps. |
| O06 | O04             | A/R   | Simulate failure of app/container and data dependency in non-production; verify monitoring, restart and recovery instructions.                                                            |
| O07 | O01,O03,O05     | A/H   | Record expected monthly spend, registry usage, memory/CPU load, domain/tunnel account limits and scaling thresholds.                                                                      |
| O08 | P12,O02,O04,O06 | A/R   | Independent final security/QA/infrastructure review, real CI check IDs, executable operator instructions and outstanding risks.                                                           |
| O09 | O08             | A/H   | Final handoff: actual Beads task counts/IDs, source/commit/image digest, host/IP mapping, URLs, tested rollback, deferred controls and next human actions.                                |

## Recommended DAG and blocking rules

- D01-D10 must be assessed before any host mutation. Some read-only discovery tasks can run concurrently.
- App readiness A01-A09 and host preparation H01-H09 can proceed in parallel after architecture approval, except for coupled tests.
- Database B01-B10 requires host/network decisions; no production schema change until B06 and B07 are addressed and explicitly approved.
- CI C01-C10 runs independently from public DNS. Branch protection C07 must know the **actual** check names emitted by C03-C05.
- Registry R01-R06 cannot claim readiness until built-image startup is verified.
- Cloudflare F01-F10 can proceed independently of registry, but publishing a hostname without F07 access control is an explicit public exposure risk. Prefer access control first where feasible.
- CD P01-P13 requires trusted artifact and restricted deploy channel. First live deployment is always a human gate.
- Operations O01-O09 are not an afterthought; monitor, rollback and recovery need completion or documented, consciously accepted exceptions before production readiness.

## Operator command and human-action contract

Every step presented to the owner must use this exact small schema:

1. **Where:** GitHub UI / Cloudflare UI / domain registrar / build host / application host / database host / home router.
2. **Why:** one sentence on the purpose and specific risk.
3. **Preconditions:** what must already be verified; whether mutation or read-only.
4. **Action:** a short command or precise UI clicks. Each terminal command in its own code block; never paste a whole shell transcript with prompts.
5. **Expected result:** exact non-secret indicator.
6. **Validation:** read-only command, UI property, or permitted functional test.
7. **Recovery:** backout, or clearly state if irreversible.
8. **Evidence requested:** only stdout without secrets, check summary, screenshot with secrets redacted, or yes/no.
9. **Beads task:** the actual ID and status changed by the result.

Never ask the owner to paste credentials, .env, database passwords, PATs, Cloudflare connector tokens, private SSH keys, or unredacted docker inspect output. Do not use curl | sh blindly. Do not request blanket chmod 777 or adding CI service accounts to docker group. Never mark an unexecuted host-side step DONE.

## Readiness verdict

The final verdict is **READY** only when: CI tests/build pass on protected ref, branch rules enforced, immutable artifact in registry, deploy host can fetch it with least privilege, origin/tunnel/Access validated, DB migrations and restricted roles tested, deployment and rollback exercised, health and monitoring available, and required human approvals recorded.

Otherwise state **BLOCKED** with the failing task IDs and exact next actions. An incomplete production system is not "ready" merely because a script exists.
