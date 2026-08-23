#!/usr/bin/env bash
# Cloud Agent session start for kipyin/kstack.
# Cursor may plant ~/.cursor/agent-hooks and reset git user.name after install.sh.
# Wait briefly for hooks to appear, then re-apply Kip identity + strip hook.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Wait up to ~30s for Cursor's co-author hook dir (session plant).
for _ in $(seq 1 30); do
  shopt -s nullglob
  matches=("${HOME}/.cursor/agent-hooks/"*/commit-msg.cursor.co-author)
  shopt -u nullglob
  if ((${#matches[@]} > 0)); then
    break
  fi
  sleep 1
done

bash "$ROOT/.cursor/hooks/install-identity.sh"
