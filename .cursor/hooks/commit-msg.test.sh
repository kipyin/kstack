#!/usr/bin/env bash
# Regression: identity-hooks + agent-hooks whose .cursor-original-hooks-path
# points at identity-hooks must return, not recurse.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DISPATCHER="$ROOT/.cursor/hooks/commit-msg"
STRIP="$ROOT/.cursor/hooks/commit-msg.cursor.strip-attribution"
TIMEOUT_SECS=5

if [[ ! -f "$DISPATCHER" ]]; then
  echo "error: missing $DISPATCHER" >&2
  exit 1
fi
if [[ ! -f "$STRIP" ]]; then
  echo "error: missing $STRIP" >&2
  exit 1
fi
if ! command -v timeout >/dev/null; then
  echo "error: timeout(1) is required so a hang is a test failure" >&2
  exit 1
fi

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

pass() {
  echo "ok: $*"
}

run_timed() {
  local label="$1"
  shift
  local rc=0
  timeout --kill-after=1s "${TIMEOUT_SECS}s" "$@" || rc=$?
  if [[ "$rc" -eq 124 || "$rc" -eq 137 ]]; then
    fail "$label hung (timeout ${TIMEOUT_SECS}s)"
  fi
  if [[ "$rc" -ne 0 ]]; then
    fail "$label exited $rc"
  fi
  pass "$label returned within ${TIMEOUT_SECS}s"
}

HOME="$(mktemp -d "${TMPDIR:-/tmp}/kstack-hook-home.XXXXXX")"
export HOME
cleanup() {
  rm -rf "$HOME" "${REPO:-}"
}
trap cleanup EXIT

HOUSE="$HOME/.cursor/identity-hooks"
AGENT="$HOME/.cursor/agent-hooks/fake-session"
mkdir -p "$HOUSE" "$AGENT"

cp "$DISPATCHER" "$HOUSE/commit-msg"
cp "$DISPATCHER" "$HOUSE/.dispatcher"
cp "$STRIP" "$HOUSE/commit-msg.cursor.strip-attribution"
chmod +x "$HOUSE/commit-msg" "$HOUSE/.dispatcher" "$HOUSE/commit-msg.cursor.strip-attribution"
for name in pre-commit prepare-commit-msg post-checkout; do
  ln -s .dispatcher "$HOUSE/$name"
done

# Cursor's agent-hooks dispatcher: exec orig, then *.cursor* hooks.
cat > "$AGENT/.dispatcher" <<'INNER'
#!/bin/bash
HOOKS_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK_NAME="$(basename "$0")"
ORIGINAL_HOOKS_PATH=""
if [ -f "$HOOKS_DIR/.cursor-original-hooks-path" ]; then
  ORIGINAL_HOOKS_PATH="$(tr -d '\n' < "$HOOKS_DIR/.cursor-original-hooks-path")"
fi
if [ -n "$ORIGINAL_HOOKS_PATH" ] && [ -x "$ORIGINAL_HOOKS_PATH/$HOOK_NAME" ]; then
  "$ORIGINAL_HOOKS_PATH/$HOOK_NAME" "$@"
fi
for cursor_hook in "$HOOKS_DIR"/$HOOK_NAME.cursor*; do
  if [ -x "$cursor_hook" ]; then
    "$cursor_hook" "$@"
  fi
done
INNER
chmod +x "$AGENT/.dispatcher"
printf '%s' "$HOUSE" > "$AGENT/.cursor-original-hooks-path"

# install-identity.sh copies the house dispatcher over commit-msg only.
cp "$DISPATCHER" "$AGENT/commit-msg"
cp "$STRIP" "$AGENT/commit-msg.cursor.strip-attribution"
chmod +x "$AGENT/commit-msg" "$AGENT/commit-msg.cursor.strip-attribution"
for name in pre-commit prepare-commit-msg post-checkout; do
  ln -s .dispatcher "$AGENT/$name"
done

write_marker() {
  local dest="$1"
  local token="$2"
  cat > "$dest" <<MEOF
#!/bin/bash
echo "$token" >> "$HOME/cursor-ran"
MEOF
  chmod +x "$dest"
}
write_marker "$AGENT/prepare-commit-msg.cursor.marker" cursor-prepare
write_marker "$AGENT/commit-msg.cursor.marker" cursor-commit-msg
write_marker "$AGENT/post-checkout.cursor.marker" cursor-post-checkout

run_timed "prepare-commit-msg" "$AGENT/prepare-commit-msg"
run_timed "post-checkout" "$AGENT/post-checkout"

REPO="$(mktemp -d "${TMPDIR:-/tmp}/kstack-hook-repo.XXXXXX")"
git -C "$REPO" init -q
git -C "$REPO" config user.name testhook
git -C "$REPO" config user.email testhook@example.com
git -C "$REPO" config commit.gpgsign false
git -C "$REPO" config core.hooksPath "$AGENT"

run_timed "git commit --allow-empty" git -C "$REPO" commit --allow-empty -m "test subject

Co-authored-by: Cursor <cursor@example.com>
"

git -C "$REPO" rev-parse --verify HEAD >/dev/null || fail "git commit produced no HEAD"
MSG="$(git -C "$REPO" log -1 --format=%B)"
if grep -qiE '^[[:space:]]*co-authored-by:' <<<"$MSG"; then
  fail "attribution not stripped: $MSG"
fi
grep -q 'test subject' <<<"$MSG" || fail "subject lost: $MSG"
pass "git commit --allow-empty succeeded and stripped attribution"

run_timed "git checkout" git -C "$REPO" checkout -B hook-test-branch

for token in cursor-prepare cursor-commit-msg cursor-post-checkout; do
  grep -qx "$token" "$HOME/cursor-ran" || fail "$token marker hook did not run"
done
pass "Cursor *.cursor* hooks still ran"

# A genuine original hook (not this dispatcher) must still be exec'd.
REAL_HOME="$(mktemp -d "${TMPDIR:-/tmp}/kstack-hook-real.XXXXXX")"
cleanup_real() {
  rm -rf "$REAL_HOME"
}
trap 'cleanup; cleanup_real' EXIT
REAL_HOUSE="$REAL_HOME/.cursor/identity-hooks"
REAL_ORIG="$REAL_HOME/user-hooks"
REAL_AGENT="$REAL_HOME/.cursor/agent-hooks/session"
mkdir -p "$REAL_HOUSE" "$REAL_ORIG" "$REAL_AGENT"
cp "$DISPATCHER" "$REAL_HOUSE/.dispatcher"
chmod +x "$REAL_HOUSE/.dispatcher"
ln -s .dispatcher "$REAL_HOUSE/prepare-commit-msg"
cat > "$REAL_ORIG/prepare-commit-msg" <<REOF
#!/bin/bash
echo real-orig >> "$REAL_HOME/ran"
REOF
chmod +x "$REAL_ORIG/prepare-commit-msg"
printf '%s' "$REAL_ORIG" > "$REAL_AGENT/.cursor-original-hooks-path"
HOME="$REAL_HOME" run_timed "real orig prepare-commit-msg" "$REAL_HOUSE/prepare-commit-msg"
grep -qx real-orig "$REAL_HOME/ran" || fail "real original hook did not run"
pass "real original hook still ran"

echo "PASS: recursive identity-hooks + agent-hooks layout returned"
