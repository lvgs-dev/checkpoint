#!/usr/bin/env bash
# Read local Git and the shared Beads database. Never claim or change work.
set -euo pipefail
git rev-parse --show-toplevel >/dev/null 2>&1 || {
  echo 'Not inside a Git repository.' >&2
  exit 2
}
branch="$(git branch --show-current)"
[ -n "$branch" ] || {
  echo 'Detached HEAD. Check out the mission branch first.' >&2
  exit 2
}
case $branch in *,* | *\"*)
  echo "Branch name contains , or \". Rename the branch before using Beads." >&2
  exit 2
  ;;
esac
worktree="$(git rev-parse --show-toplevel)"
printf 'Branch: %s\nWorktree: %s\nHEAD: ' "$branch" "${worktree##*/}"
git rev-parse HEAD
git status --short
git diff --stat
git log -10 --oneline
if ! command -v bd >/dev/null 2>&1; then
  echo 'bd is not installed. Restore access to the repository shared Beads database before claiming work.'
  exit 0
fi
python3 - "$branch" "${worktree##*/}" <<'PY'
import json
import re
import shlex
import subprocess
import sys
from datetime import datetime, timezone

branch, folder = sys.argv[1:]
COMMIT = re.compile(r"^\S+ status: .*commit: ([0-9a-f]{7,40})")
NOW = datetime.now(timezone.utc)


def bd(*args):
    return subprocess.check_output(["bd", "--readonly", *args], text=True)


def rows(*args):
    data = json.loads(bd(*args, "--json")) or []
    return data if isinstance(data, list) else [data]


def show(issue):
    return rows("show", issue)[0]


def block(text, prefix="  "):
    lines = [line for line in text.splitlines() if line.strip()]
    return "\n".join(prefix + line for line in lines) or prefix + "(none)"


def last(lines, key):
    return next((line for line in reversed(lines) if key in line), "(none)")


def commit_state(notes):
    found = [m.group(1) for line in notes.splitlines() if (m := COMMIT.match(line))]
    if not found:
        return "commit MISSING (no commit note)"
    merged = subprocess.run(["git", "merge-base", "--is-ancestor", found[-1], "HEAD"],
                            capture_output=True).returncode == 0
    return "commit OK" if merged else f"commit MISSING ({found[-1]})"


def header(label, item):
    lease = item.get("lease_expires_at")
    state = ""
    if lease:
        expires = datetime.fromisoformat(lease.replace("Z", "+00:00"))
        state = " (EXPIRED)" if expires <= NOW else " (LIVE)"
    elif item.get("status") == "in_progress":
        state = " (NO LEASE: ask coordinator)"
    return (f'{label}: {item["id"]} | assignee: {item.get("assignee") or "unassigned"} | '
            f'status: {item.get("status", "unknown")} | lease_expires_at: {lease or "none"}{state}')


def children(issue):
    for child in rows("list", "--parent", issue, "--brief", "--limit", "0", "--status", "all"):
        if child["status"] == "in_progress":
            task = show(child["id"])
            notes = task.get("notes", "")
            lines = notes.splitlines()
            print(f'\n{header("Task", task)} | {commit_state(notes)}')
            print("Last notes:")
            print(block("\n".join(lines[-5:])))
            print("Last next:")
            print(block(last(lines, "next:")))
            print("Last verify:")
            print(block(last(lines, "verify:")))
        children(child["id"])


print(f'UTC now: {NOW.strftime("%Y-%m-%dT%H:%M:%SZ")}')
try:
    epics = rows("list", "-l", f"branch:{branch}", "--brief", "--type", "epic", "--limit", "0")
    if not epics:
        command = ["bd", "create", f"[{branch}] <mission title>", "--type", "epic",
                   "--labels", f"branch:{branch},worktree:{folder}",
                   "--description", "<original owner brief verbatim, constraints and links>",
                   "--acceptance", "<done criteria>"]
        print("No mission epic exists. Ask the coordinator to create it:")
        print(shlex.join(command))
    for epic in epics:
        mission = show(epic["id"])
        print(f'\n{header("Epic", mission)}\nMission:')
        print(block(mission.get("description", "")))
        print("Decision and mission notes:")
        print(block(mission.get("notes", "")))
        children(epic["id"])
    print("\nReady:")
    ready = rows("ready", "-l", f"branch:{branch}", "--brief")
    print("\n".join(f'  {row["id"]} | P{row["priority"]} | {row["title"]}' for row in ready) or "  (none)")
except (subprocess.CalledProcessError, ValueError, KeyError, TypeError) as error:
    sys.exit(f"Cannot read Beads resume context: {error}")
PY
