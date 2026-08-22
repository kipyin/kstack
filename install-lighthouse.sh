#!/usr/bin/env bash
set -euo pipefail

DEST="${HOME}/.cursor/skills"
WORKDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$DEST"

SKILLS=(
  db-create-update
  define-golden-cases
  gitee-pr-address
  gitee-pr-review
  gitee-pr-submit
  gitee-pr-workflow
  pr-debrief
)

for name in "${SKILLS[@]}"; do
  src="${WORKDIR}/lighthouse/${name}"
  if [[ ! -d "$src" ]]; then
    echo "error: missing Lighthouse skill directory: $src" >&2
    exit 1
  fi
  rm -rf "${DEST}/${name}"
  cp -R "$src" "${DEST}/${name}"
done

echo "Installed Lighthouse skills into $DEST:"
ls -1 "$DEST"
