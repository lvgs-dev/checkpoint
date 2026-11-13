# Delivery checklist

1. Owner: GitHub > Settings > Environments > New environment: `production`.
   Set deployment branch to `main`. Add no required reviewers.
   Variables > Add variable: `PUBLIC_HOSTNAME` = `game-list.gps.dev.br`.
   Fill the remaining required values in `deploy/env-manifest.json`.
2. Owner on Atlas: `sudo install -d -o github-deploy -g github-deploy -m 0700 /var/lib/game-list-production /var/lib/game-list-production/env`.
3. Owner: Cloudflare Zero Trust > Networks > Tunnels > atlas > Public Hostname: `game-list.gps.dev.br` -> `http://game-list-game-list-1:8000`.
   Cloudflare Zero Trust > Access > Applications > Add self-hosted application: `game-list.gps.dev.br`. Select the owner Allow policy.
4. Runner-group entry: already covered by the engine release sha entry.

Ensure the integration branch exists: `gh api repos/lvgs-dev/game-list/branches/homolog >/dev/null 2>&1 || gh api -X POST repos/lvgs-dev/game-list/git/refs -f ref=refs/heads/homolog -f sha="$(gh api repos/lvgs-dev/game-list/branches/main --jq .commit.sha)"`.
Next: `gh pr create --base homolog`. Wait for green CI and merge the reviewed PR.
Owner: GitHub > Settings > Rules > Rulesets. After green CI, activate `Protect homolog` (homolog, PR + required checks),
`Protect main` (main, PR + one owner approval + required checks, merge commits only), and `Protect release tags` (v*, block creation/update/deletion).
Select the PR check names from the green run. Open the homolog-to-main PR; the owner approves and merges it.

Created files:

- `.dockerignore`
- `.github/workflows/ci.yml`
- `AI/operations/delivery-checklist.md`
- `Dockerfile`
- `compose.edge.yaml`
- `compose.prod.yaml`
- `compose.yaml`
- `deploy/env-manifest.json`
- `deploy/health.cjs`
- `deploy/project.json`
- `deploy/scaffold.json`
- `deploy/start.cjs`

Revision: the application health JSON must report the deployed runtime commit in `revision`.
The health JSON `revision` must match the deployed commit. Never bake it into the image.

Verify from the project folder: `lvgs-bootstrap verify` (`lvgs-dev/game-list`).
