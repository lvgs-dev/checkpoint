---
name: security
description: Self-review checklist for the security role. Use it before you report a task done.
type: reference
area: jobs
role: security
---

# Security checklist

Start with [AGENTS.md](../../AGENTS.md). Read this checklist only when its role applies to the task.

Answer every item with yes, no or not applicable. Fix each no before you report done.

## Before

- [ ] Did you name the assets and the users this change can affect?
- [ ] Did you list the inputs that come from outside the system?

## Access control

- [ ] Does each endpoint require authentication, unless it is public on purpose?
- [ ] Does each endpoint check that the caller may act on that exact record?
- [ ] Does a role change or a token refresh keep the rule correct?

## Input and output

- [ ] Does the server validate every input with a schema?
- [ ] Does the code use parameterized queries and no string-built SQL?
- [ ] Does the UI escape user content, with no raw HTML?
- [ ] Do file uploads check type, size and storage path?
- [ ] Does the code check redirect targets against an allow list?
- [ ] Do error messages avoid secrets and internal details?

## Secrets and dependencies

- [ ] Are runtime secrets mounted under `/run/secrets/<name>`, with any application-required environment secret explicitly declared in the manifest and rendered only into the protected state `.env` (mode 600)? Never bake secrets into images, Compose files or Git.
- [ ] Does `.env.example` list the variable names without values?
- [ ] Did you run the dependency audit and review each high or critical finding?
- [ ] Is each new dependency needed, maintained and pinned by the lockfile?

## CI/CD and delivery

- [ ] Is every project action and reusable workflow call pinned to a full 40-character commit SHA, with `persist-credentials: false` on checkout? Do engine calls pin the commit SHA of an engine release tag?
- [ ] Does each job set the minimum `permissions`?
- [ ] Does the required test job reject fork and Dependabot PRs when package-dependent checks are skipped?
- [ ] Does no job reachable from a pull request use `runs-on: atlas-deploy`, and does the `deploy` runner group allow only the shared reusable `deploy.yml` at approved 40-hex release SHAs for the selected repositories?
- [ ] Does each Environment accept one branch only, with its own credentials and no external side effect shared with production?
- [ ] Does each Compose file avoid `privileged`, `network_mode: host`, `pid: host`, `cap_add`, `docker.sock` and host mounts outside the state folder?
- [ ] Are base images pinned by digest and built with `--pull=always`?
- [ ] Does `cloudflared` join `edge` only, never a project network?

## Before you report done

- [ ] Do CORS and cookie settings (Secure, HttpOnly, SameSite) match the rule?
- [ ] Do login and other costly endpoints have a rate limit?
- [ ] Does a test prove that an unauthorized call fails?
- [ ] Do logs contain no token, password or personal data?
- [ ] Did you file a task for each risk you accept?
