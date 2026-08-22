#!/usr/bin/env bash
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

npx --yes skills@latest add mattpocock/skills --global --agent cursor --yes --copy \
  --skill ask-matt \
  --skill code-review \
  --skill codebase-design \
  --skill diagnosing-bugs \
  --skill domain-modeling \
  --skill grill-me \
  --skill grill-with-docs \
  --skill grilling \
  --skill handoff \
  --skill implement \
  --skill improve-codebase-architecture \
  --skill prototype \
  --skill research \
  --skill resolving-merge-conflicts \
  --skill setup-matt-pocock-skills \
  --skill tdd \
  --skill teach \
  --skill to-questionnaire \
  --skill to-spec \
  --skill to-tickets \
  --skill triage \
  --skill wait-what \
  --skill wayfinder \
  --skill wizard \
  --skill writing-for-agents

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
