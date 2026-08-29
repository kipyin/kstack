#!/usr/bin/env bash
# Cloud Agent env for THIS repo (kipyin/kstack).
# Workspace already is the skills checkout — copy global/ into ~/.cursor/skills.
# Mac uses `kstack link`; other app repos clone this repo (see SETUP.md).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/packages/kstack"
npm ci
npm run build
cd "$ROOT"
bash "$ROOT/install.sh" global
# Optional git author/signing from env + house commit-msg (always strip).
# Session start re-applies via .cursor/start.sh (install + keeper).
bash "$ROOT/.cursor/hooks/install-identity.sh"
