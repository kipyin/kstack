#!/usr/bin/env bash
set -euo pipefail
DEST="${HOME}/.cursor/skills"
WORKDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$DEST"
for d in "$WORKDIR"/*/; do
  name="$(basename "$d")"
  case "$name" in
    .git) continue ;;
  esac
  rm -rf "$DEST/$name"
  cp -R "$d" "$DEST/$name"
done
echo "Installed skills into $DEST:"
ls -1 "$DEST"
