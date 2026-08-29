#!/usr/bin/env bash
# Re-runnable: Kip GitHub noreply author + house commit-msg that always strips.
# Idempotent. Safe after Cursor plants or resets ~/.cursor/agent-hooks / hooksPath.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DISPATCHER_SRC="$ROOT/.cursor/hooks/commit-msg"
STRIP_SRC="$ROOT/.cursor/hooks/commit-msg.cursor.strip-attribution"
HOUSE="${HOME}/.cursor/identity-hooks"

if [[ ! -f "$DISPATCHER_SRC" ]]; then
  echo "error: missing house commit-msg: $DISPATCHER_SRC" >&2
  exit 1
fi
if [[ ! -f "$STRIP_SRC" ]]; then
  echo "error: missing strip hook: $STRIP_SRC" >&2
  exit 1
fi

git config --global user.name Kip
git config --global user.email 28321392+kipyin@users.noreply.github.com

install_file() {
  local src="$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  if [[ -e "$dest" || -L "$dest" ]]; then
    if [[ ! -L "$dest" ]] && cmp -s "$src" "$dest"; then
      chmod +x "$dest" 2>/dev/null || true
      return 0
    fi
  fi
  rm -f "$dest"
  cp "$src" "$dest"
  chmod +x "$dest"
  echo "installed $dest"
}

ensure_symlink() {
  local target="$1" link="$2"
  if [[ -L "$link" && "$(readlink "$link")" == "$target" ]]; then
    return 0
  fi
  rm -f "$link"
  ln -s "$target" "$link"
  echo "linked $link -> $target"
}

# Stable hooksPath we own. Git runs these even if Cursor's session dir appears later.
mkdir -p "$HOUSE"
install_file "$DISPATCHER_SRC" "$HOUSE/commit-msg"
install_file "$DISPATCHER_SRC" "$HOUSE/.dispatcher"
install_file "$STRIP_SRC" "$HOUSE/commit-msg.cursor.strip-attribution"
for name in \
  pre-commit prepare-commit-msg pre-merge-commit post-commit \
  pre-push pre-rebase post-checkout post-merge post-rewrite \
  applypatch-msg pre-applypatch post-update pre-receive update \
  push-to-checkout sendemail-validate fsmonitor-watchman
do
  ensure_symlink .dispatcher "$HOUSE/$name"
done

current_global="$(git config --global --get core.hooksPath || true)"
if [[ "$current_global" != "$HOUSE" ]]; then
  git config --global core.hooksPath "$HOUSE"
  echo "set global core.hooksPath -> $HOUSE"
fi
if git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  current_local="$(git -C "$ROOT" config --local --get core.hooksPath || true)"
  if [[ "$current_local" != "$HOUSE" ]]; then
    git -C "$ROOT" config --local core.hooksPath "$HOUSE"
    echo "set local core.hooksPath -> $HOUSE"
  fi
fi

# Backup: own commit-msg inside whatever dir git might use if Cursor resets hooksPath.
SEEN=""
install_into_hooks_dir() {
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
  if [[ "$norm" == "$HOUSE" ]]; then
    return 0
  fi
  # rm first: commit-msg is often a symlink to .dispatcher; cp would overwrite .dispatcher.
  if [[ -L "$norm/commit-msg" ]] || ! cmp -s "$DISPATCHER_SRC" "$norm/commit-msg" 2>/dev/null; then
    rm -f "$norm/commit-msg"
    cp "$DISPATCHER_SRC" "$norm/commit-msg"
    chmod +x "$norm/commit-msg"
    echo "installed house commit-msg -> $norm/commit-msg"
  fi
  install_file "$STRIP_SRC" "$norm/commit-msg.cursor.strip-attribution"
}

if hp="$(git config --get core.hooksPath || true)" && [[ -n "$hp" ]]; then
  install_into_hooks_dir "$hp"
fi
shopt -s nullglob
for d in "${HOME}/.cursor/agent-hooks/"*/; do
  install_into_hooks_dir "$d"
done
