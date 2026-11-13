---
name: homolog-vm
description: The disposable homolog VM on Oreon. Why it exists, how to build it, how to prove that it cannot reach production.
type: how-to
area: guide-lines
---

# Homolog VM on Oreon

Start with [the roadmap](new-project-roadmap.md). Read this note once, when you build the homolog host, and again when a runner or a tunnel changes.

## Why

Any agent may merge into `homolog` when the checks pass. The `homolog` workflow and deploy scripts then run on a host. On Atlas they would run as the user that owns the production state and sits in the `docker` group (root-equivalent). So homolog runs on a separate host: a small VM on Oreon.

| Host                | Runs                | Runner label     | Runner group (workflow access)                                               |
| ------------------- | ------------------- | ---------------- | ---------------------------------------------------------------------------- |
| Atlas               | production only     | `atlas-deploy`   | `deploy`: `lvgs-dev/ci-workflows/.github/workflows/deploy.yml@<release SHA>` |
| Homolog VM on Oreon | every homolog       | `homolog-deploy` | `homolog`: the same reusable deploy workflow at its release SHA              |
| Oreon               | CI and image builds | `oreon`          | none                                                                         |

The VM may die and be rebuilt at any time. It holds no production data, no production secret and no route to production.

## Build it

Owner steps need `sudo` on Oreon. Agent steps are scripts in this folder.

1. Owner, on Oreon: `sudo apt install -y qemu-system-x86 libvirt-daemon-system libvirt-clients virtinst cloud-image-utils nftables`, then `sudo adduser $USER libvirt` and log in again.
2. Owner: `sudo systemctl enable --now libvirtd nftables` and make sure the default network is up: `sudo virsh net-autostart default; sudo virsh net-start default`.
3. Owner: apply the firewall first, so the VM never has a route to the LAN: `sudo nft -f scripts/homolog-vm/firewall.nft`. To keep it after a reboot add `include "<absolute path>/firewall.nft"` to `/etc/nftables.conf`.
4. Owner: `sudo bash scripts/homolog-vm/create-vm.sh --ssh-key-file ~/.ssh/id_ed25519.pub` (dry run), then add `--execute`. Size: 1536 MB, 1 CPU, 30 GB. Oreon has 3.6 GB and 3.8 GB of swap, so keep the VM small and run one homolog stack at a time.
5. Owner: wait two minutes, `sudo virsh domifaddr homolog`, then `ssh homolog@<address>`.

## Prove the isolation (do not skip)

Run these inside the VM. Every "must fail" must fail:

```bash
nc -vz -w3 192.168.0.200 5432   # must fail: production database on Atlas
nc -vz -w3 192.168.0.1 22       # must fail: any LAN host
ping -c1 -W2 192.168.122.1      # must fail: the Oreon host
curl -sS -o /dev/null -w '%{http_code}\n' https://ghcr.io/v2/   # must print 401 or 200: the internet works
```

## Register the runner

1. Owner, GitHub website: `https://github.com/organizations/<owner>/settings/actions/runner-groups`, click `New runner group`, name it `homolog`, `Selected workflows`, add `lvgs-dev/ci-workflows/.github/workflows/deploy.yml@<40-hex release SHA>`. Use the commit SHA of the chosen release tag. Repository access: only the projects that use homolog.
2. Owner: open `https://github.com/organizations/<owner>/settings/actions/runners`, click `New runner`, `Linux`, `x64`. Copy the token it shows.
3. In the VM, as a normal user named `runner`: follow the commands on that page, and when it asks for the runner group type `homolog`, and for extra labels type `homolog-deploy`. Install it as a service: `sudo ./svc.sh install runner && sudo ./svc.sh start`.
4. Owner: use `lvgs-access scripts/release-finalize.sh vX.Y.Z [--dry-run]` to grant release access in the Atlas runner group `deploy`. Follow [engine releases](ci-cd.md#engine-releases). Keep the homolog group on the same pinned reusable deploy workflow. The finalizer never removes entries. The reusable workflow fixes the runner label per environment; callers run only on trusted branch pushes.

## Tunnel and route

The VM runs its own `cloudflared` on its own `edge` network, so `compose.edge.yaml` works unchanged. Production keeps the tunnel on Atlas.

1. Owner: `https://one.dash.cloudflare.com` > Networks > Tunnels > Create a tunnel > Cloudflared. Name it `homolog`. Copy the token it shows.
2. In the VM: `docker run -d --name cloudflared --restart unless-stopped --network edge cloudflare/cloudflared:latest tunnel --no-autoupdate run --token <token>`. The token stays in the VM only.
3. Owner: create each homolog route with `ensure-cloudflare-route.sh` from the ci-workflows engine and the id of the **homolog** tunnel (see [the roadmap](new-project-roadmap.md) phase 9).

## Rebuild

`sudo virsh destroy homolog; sudo virsh undefine homolog --remove-all-storage`, then run the create script again. Register the runner again (a new token) and recreate the tunnel container.

## Related

- [Security and access](new-project-security-and-access.md): Runner groups and who can do what.
- [Roadmap](new-project-roadmap.md): Where homolog fits in each phase.
