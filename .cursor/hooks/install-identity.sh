#!/usr/bin/env bash
# Re-runnable: set Cloud Agent git author to Kip GitHub noreply and install
# the commit-msg strip hook into Cursor's agent-hooks directory.
# Safe to run after Cursor plants ~/.cursor/agent-hooks (session start).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOOK_SRC="$ROOT/.cursor/hooks/commit-msg.cursor.strip-attribution"

if [[ ! -f "$HOOK_SRC" ]]; then
  echo "error: missing strip hook: $HOOK_SRC" >&2
  exit 1
fi

git config --global user.name Kip
git config --global user.email 28321392+kipyin@users.noreply.github.com

SEEN=""
install_strip_hook() {
  local dest="$1"
  if [[ ! -d "$dest" ]]; then
    return 0
  fi
  local norm
  norm="$(cd "$dest" && pwd)"
  case " $SEEN " in
    *" $norm "*) return 0 ;;
  esac
  SEEN="${SEEN} ${norm}"
  cp "$HOOK_SRC" "$norm/commit-msg.cursor.strip-attribution"
  chmod +x "$norm/commit-msg.cursor.strip-attribution"
  echo "installed strip hook -> $norm/commit-msg.cursor.strip-attribution"
}

if hp="$(git config --get core.hooksPath || true)" && [[ -n "$hp" ]]; then
  install_strip_hook "$hp"
fi

shopt -s nullglob
for d in "${HOME}/.cursor/agent-hooks/"*/; do
  install_strip_hook "$d"
done
