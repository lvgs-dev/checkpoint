---
name: new-project-security-and-access
description: Identities, tokens, the GitHub App, Environment values, file modes, server isolation, and a matrix of who may do what.
type: explanation
area: guide-lines
---

# Security and access

Start with [the roadmap](new-project-roadmap.md). Read this note in phases 1, 2, 8, and 9, and before you rotate or delete a credential.

## Principles

- A credential has one job and one owner.
- Prefer a short-lived credential that a tool creates on demand. Avoid a stored one.
- An agent acts as a bot. It never uses the owner's personal login unless the owner starts it that way.
- Runtime secrets live in the GitHub Environment and the protected state folder. The manifest maps file secrets into `/run/secrets`. A declared environment secret may go into the protected `.env` for an app that requires it. Never put a secret in a repository, log, or chat prompt.
- The owner approves every change to production. The bot cannot approve its own work.

## The identities

| Identity                    | What it is                                         | Where its secret lives                                                         | Lifetime           | Used for                                                     |
| --------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------ |
| Owner login                 | The human's GitHub account                         | The owner's computer. Optional `gh` login on the server.                       | Long               | Settings, rulesets, Environments, approvals.                 |
| Owner SSH key               | A key on the owner's own machine                   | The owner's computer                                                           | Long               | Personal pushes from that machine.                           |
| Bot `lvgs-agents`           | A GitHub App                                       | Private key on Atlas, mode 600                                                 | Tokens last 1 hour | Branches, pull requests, merges into `homolog`, reading CI.  |
| `GITHUB_TOKEN`              | A token that GitHub creates for each job           | Nowhere. It exists during the job.                                             | The job            | Registry login, package install, and read of the repository. |
| Cloudflare API token        | A token with three scopes                          | The owner's own shell or password manager. Never GitHub, never the agent home. | 90 days            | Creating routes, by the owner, once per hostname.            |
| Runner user `github-deploy` | A Linux user without `sudo`, in the `docker` group | The server                                                                     | Permanent          | Runs deploy jobs.                                            |
| Database users              | Postgres roles, one database per environment       | A secret file per environment                                                  | Until rotated      | The app and the migration.                                   |

No personal access token (PAT) is part of the design. Delete any that you find.

## The GitHub App `lvgs-agents`

An App is a robot account that the organization owns. It replaces a personal token for agents.

What it can do (repository permissions):

| Permission                       | Level          | Why                                    |
| -------------------------------- | -------------- | -------------------------------------- |
| Contents                         | Read and write | Push branches.                         |
| Pull requests                    | Read and write | Open, update, and merge pull requests. |
| Issues                           | Read and write | Comment and label.                     |
| Workflows                        | Read and write | Edit files under `.github/workflows`.  |
| Actions, Checks, Commit statuses | Read           | Read the CI result.                    |
| Metadata                         | Read           | Required by GitHub.                    |

What it cannot do, by design:

- Change repository settings, rulesets, Environments, or secrets. It has no Administration, Secrets, or Environments permission.
- Approve a pull request that it opened. The owner approves.
- Read or write packages from a server. CI reads packages with `GITHUB_TOKEN`.

Create it once (owner):

1. Open the organization settings, Developer settings, GitHub Apps, New GitHub App. Name it `lvgs-agents`.
2. Turn the webhook off. Choose "Only on this account".
3. Set the permissions in the table above. Set no organization permission.
4. Generate a private key. Note the App id and the installation id.
5. Install the App on the organization. Add each new repository in the App's installation settings.
6. Copy the key to the server with `scp`. Store it as `~/.config/lvgs-agents/app.pem` with mode 600. Never paste it in a chat.

How it works on the server:

1. A small program signs a request with the private key and asks GitHub for an installation token.
2. GitHub returns a token that lives one hour. The program caches it for 45 minutes in `/run/user/<uid>`.
3. `git` calls the credential helper whenever it needs a password for `github.com`. The helper returns the token.
4. `gh` is a wrapper in `~/.local/bin/gh`. It sets the token and starts the real `gh`.
5. The global `~/.gitconfig` sets the bot name and e-mail. It rewrites `git@github.com:` to HTTPS.

Nothing runs in the background. No cron renews the token. The program checks the cache each time.

The program and the helper live in `~/.config/lvgs-agents/libexec/`. They are not commands on `PATH`.
No agent needs to know them.

Owner access on the server:

- Run `lvgs-access <command>` to run any command with the owner's login and SSH key, for example `lvgs-access claude`.
- Without it, `git` and `gh` act as the bot.

Rotate the App key:

1. Generate a new key in the App settings.
2. Copy it to the server. Replace `app.pem`.
3. Delete the old key in the App settings.

## `GITHUB_TOKEN` in CI

- Set `permissions:` on each job. Start from `contents: read`.
- Add `packages: read` to jobs that install a private package or pull an image.
- Add `packages: write` to the publish job only.
- The token reaches the build as a BuildKit secret file. It never enters a build argument, an environment variable of the image, or a layer.
- The deploy job logs in to GHCR with the token on standard input. It deletes the credentials folder at the end, even after a failure.
- Give each package access under "Manage Actions access". Repositories that install a package need Read. The publishing repository needs Write.

## Environment values

An Environment is a named set of secrets and variables. Only jobs that name it can read it. The branch policy limits which branch can name it.

| Environment  | Branch policy | Required reviewers                              |
| ------------ | ------------- | ----------------------------------------------- |
| `homolog`    | `homolog`     | none                                            |
| `production` | `main`        | none. The approval happens on the pull request. |

Rules:

- A secret holds a password, a key, or a token. A variable holds a name, a port, an identifier, or a setting.
- Platform names and scopes are in [environments and secrets](environments-and-secrets.md). The project lists every application variable and secret in `deploy/env-manifest.json`. Optional values use `required:false`; GitHub cannot store empty secrets.
- The deploy job writes files on the server from these values every time. A manual edit on the server is lost.
- To change a value, edit the Environment and re-run the deploy job.
- The owner sends values with `lvgs-env-apply`. It prints names and lengths, never values.
- A value file with secrets stays under `~/.config/lvgs-agents/env/` with mode 600. Delete it when you no longer need it.
- Use a different database password in each environment.

## Files and modes on the server

| Path                        | Owner           | Mode | Why                                                                          |
| --------------------------- | --------------- | ---- | ---------------------------------------------------------------------------- |
| `/var/lib/<project>-<env>/` | `github-deploy` | 700  | State, locks, backups. Only the runner user enters.                          |
| `.../env/.env`              | `github-deploy` | 600  | Settings that Compose reads on the host.                                     |
| `.../env/secrets/`          | `github-deploy` | 700  | Keeps other users away from the secret files.                                |
| `.../env/secrets/<name>`    | `github-deploy` | 644  | The container user reads it through the bind mount.                          |
| `~/.config/lvgs-agents/`    | the agent user  | 700  | The App key and value files. Cloudflare API credentials stay with the owner. |

The folders with mode 700 are what protects the 644 files.
The group `docker` is equal to administrator on the host. Keep that group small.

## Server isolation

- The runner user cannot read the home folder of the agent user. It cannot read the production state of older setups.
- The agent user cannot read the new state folders. This is intended.
- Oreon builds and tests code from pull requests. Atlas deploys production only (label `atlas-deploy`). The homolog runner pool is planned on an isolated Oreon VM (label `homolog-deploy`). The VM is not built yet. Keep homolog deployment disabled until it is ready; see [the homolog VM](homolog-vm.md).
- The runner group `deploy` uses Selected workflows and allows `lvgs-dev/ci-workflows/.github/workflows/deploy.yml@<40-hex release SHA>`. The owner runs `lvgs-access scripts/release-finalize.sh vX.Y.Z [--dry-run]` before projects update their pins. Follow [engine releases](ci-cd.md#engine-releases) for scope, preview, and verification. Allow the same pinned reusable deploy workflow in the homolog runner group when enabled. Project callers gate deployment to trusted pushes; Environment branch policies restrict secrets. Keep repository access scoped. Only the owner changes runner-group access.
- Homolog is a disposable environment, not a trust boundary. When enabled, its deploy jobs must run on the isolated VM. That VM must have no production data, production secret, Cloudflare token or route to Atlas ([homolog VM](homolog-vm.md)). The one thing a bad `homolog` workflow could still do is publish an image that does not match its code. The reusable publish workflow in the owner-only repository closes that (see the pinned engine documentation and [current mission](https://github.com/lvgs-dev/subharness/blob/main/AI/ci-cd-review/mission.md)).
- A pull request from a fork never runs on a self-hosted runner and never gets a secret.
- An agent sandbox limits where the agent writes. It does not limit what the agent reads. A prompt rule and a review keep an agent away from `~/.config/lvgs-agents`.

## Cloudflare

- The API token has three scopes on one zone: Tunnel Edit, DNS Edit, and Access Apps and Policies Edit. Give it an expiry date.
- The token is never a GitHub secret. No deploy job holds a Cloudflare API credential. An optional read-only Access health token is separate. The owner runs `ensure-cloudflare-route.sh` from the ci-workflows engine once per hostname. The deploy job only checks the public endpoint.
- `cloudflared` joins the `edge` network only, never a project network that holds a database.
- A reusable Access policy holds the allowed e-mail. Apps reference it by id.
- The route script is idempotent and never deletes or overwrites a conflicting record.
- A wildcard `A` record may exist on the zone. A specific `CNAME` for the hostname wins over it.

## Branch protection

| Branch    | Pull request | Approvals     | Merge method      | Checks                    | Bypass |
| --------- | ------------ | ------------- | ----------------- | ------------------------- | ------ |
| `homolog` | required     | 0             | squash or merge   | the three required checks | none   |
| `main`    | required     | 1 (the owner) | merge commit only | the three required checks | none   |

Because the bot opens the pull requests, the owner can approve them.
Do not add a bypass actor after the App exists.

## Who may do what

| Action                                    | Owner login              | Bot                                 | CI job token                         | Atlas runner |
| ----------------------------------------- | ------------------------ | ----------------------------------- | ------------------------------------ | ------------ |
| Push a feature branch                     | yes                      | yes                                 | no                                   | no           |
| Open a pull request                       | yes                      | yes                                 | no                                   | no           |
| Merge into `homolog`                      | yes                      | yes (after review and green checks) | no                                   | no           |
| Approve the merge into `main`             | yes                      | no                                  | no                                   | no           |
| Merge into `main`                         | yes                      | no                                  | no                                   | no           |
| Create a tag                              | yes                      | no                                  | no                                   | no           |
| Change rulesets or settings               | yes                      | no                                  | no                                   | no           |
| Create or change Environments and secrets | yes                      | no                                  | no                                   | no           |
| Re-run a workflow                         | yes                      | no (Actions is read-only)           | no                                   | no           |
| Publish an image                          | no                       | no                                  | yes (`packages: write`, publish job) | no           |
| Install a private package in CI           | no                       | no                                  | yes (`packages: read`)               | no           |
| Pull the image on the server              | no                       | no                                  | yes (same token)                     | yes          |
| Start or stop containers                  | `sudo` or `docker` group | no                                  | no                                   | yes          |
| Create a Cloudflare route                 | yes                      | no                                  | no                                   | no           |
| Read the production state folder          | `sudo`                   | no                                  | no                                   | yes          |
| Delete a remote branch                    | yes                      | not by rule                         | no                                   | no           |

## Respond to a leak

1. Delete or revoke the credential at its source: the App key, the Cloudflare token, or the Environment secret.
2. Create a new one. Store it in the same place.
3. Re-run the deploy jobs to rewrite the files.
4. Rotate the database password: change it in the database, then in the Environment, then re-run the job.
5. Write a short note in `AI/decisions/` with what happened and what changed.

## Teach a new agent tool

1. Start the tool in `~/projects`. It reads `AGENTS.md` there (and `CLAUDE.md` or `GEMINI.md` for tools that look for them).
2. That file states the identity rules and the server commands.
3. Do not give the tool a token. It uses the bot through `git` and `gh`.
4. Start it with `lvgs-access <tool>` only when a task needs the owner's access.

## Related

- [New project roadmap](new-project-roadmap.md): The ordered phases.
- [Workflow and scripts](new-project-workflow-and-scripts.md): The reusable workflow calls and deploy steps.
- [CI and CD traps](ci-cd-traps.md): Failures that involve tokens and modes.
- [Environments and secrets](environments-and-secrets.md): The standard rules.
- [Branch protection](branch-protection.md): Ruleset details.
