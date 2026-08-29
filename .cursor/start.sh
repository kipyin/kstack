#!/usr/bin/env bash
# Cloud Agent session start for kipyin/kstack.
# Apply optional git identity + house commit-msg immediately, then keep re-applying.
# Cursor can plant ~/.cursor/agent-hooks and reset hooksPath / git user after
# this script returns; a 30s wait-and-copy-once is not enough.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$ROOT/.cursor/hooks/install-identity.sh"

KEEP="$ROOT/.cursor/hooks/keep-identity.sh"
LOG="${HOME}/.cursor/identity-keeper.log"
mkdir -p "$(dirname "$LOG")"
setsid -f bash "$KEEP" </dev/null >>"$LOG" 2>&1 || true
