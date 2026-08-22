#!/usr/bin/env bash
# Cloud / VM install: copy skill folders from this checkout into ~/.cursor/skills.
# Never fetches packages and never runs npx. Vendored lock-owned skills are
# already flattened into global/ (and project tiers).
#
# Mac checkouts should use `kstack link` instead of this script.
set -euo pipefail

DEST="${HOME}/.cursor/skills"
WORKDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $# -gt 1 ]]; then
  echo "error: unexpected extra arguments: ${*:2}" >&2
  echo "usage: $0 [global|lighthouse|lightmind]" >&2
  exit 1
fi

PROJECT="${1:-global}"

case "$PROJECT" in
  global|lighthouse|lightmind) ;;
  *)
    echo "error: unknown project '${PROJECT}'." >&2
    echo "Expected: global, lighthouse, or lightmind (omit for global only)." >&2
    exit 1
    ;;
esac

mkdir -p "$DEST"

copy_skill_dirs() {
  local src_root="$1"
  local label="$2"

  if [[ ! -d "$src_root" ]]; then
    echo "error: missing ${label} directory: $src_root" >&2
    exit 1
  fi

  local src name
  while IFS= read -r -d '' src; do
    name="$(basename "$src")"
    rm -rf "${DEST}/${name}"
    cp -R "$src" "${DEST}/${name}"
  done < <(find "$src_root" -mindepth 1 -maxdepth 1 -type d ! -name '.*' -print0)
}

copy_skill_dirs "${WORKDIR}/global" "global"

if [[ "$PROJECT" != "global" ]]; then
  copy_skill_dirs "${WORKDIR}/${PROJECT}" "$PROJECT"
fi

echo "Installed skills (${PROJECT}) into $DEST:"
ls -1 "$DEST"
