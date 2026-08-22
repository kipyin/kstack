#!/usr/bin/env bash
set -euo pipefail

DEST="${HOME}/.cursor/skills"
WORKDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

EXTRAS=(show-me talk-normal ultra-review humanizer-zh explain-diff-html)
for name in "${EXTRAS[@]}"; do
  src="${WORKDIR}/${name}"
  if [[ ! -d "$src" ]]; then
    echo "error: missing extra skill directory: $src" >&2
    exit 1
  fi
  rm -rf "${DEST}/${name}"
  cp -R "$src" "${DEST}/${name}"
done

echo "Installed skills into $DEST:"
ls -1 "$DEST"
