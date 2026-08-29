#!/usr/bin/env bash
# Re-apply house identity + commit-msg for the life of the session.
# Cursor can plant ~/.cursor/agent-hooks or reset core.hooksPath after start.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INSTALL="$ROOT/.cursor/hooks/install-identity.sh"
LOCK="${HOME}/.cursor/identity-keeper.lock"
LOG="${HOME}/.cursor/identity-keeper.log"

if [[ ! -f "$INSTALL" ]]; then
  echo "error: missing $INSTALL" >&2
  exit 1
fi

mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK"
if ! flock -n 9; then
  exit 0
fi

echo "identity-keeper start pid=$$ ts=$(date -Is) root=$ROOT" >>"$LOG"

while true; do
  bash "$INSTALL" >>"$LOG" 2>&1 || true
  sleep 2
done
