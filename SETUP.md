# Cloud Agent skills

Wire a new app repo's Cloud Agent environment to this Origin repo. Skills stay here; the environment clones and copies them.

Mac checkouts use [README.md](README.md) (`kstack link`). This page is the Cloud copy path. For Cloud Agents working **on this repo**, skip the clone block and use [This repo's own Cloud Agent environment](#this-repos-own-cloud-agent-environment).

## 1. Source

https://origin.cursor.com/kipyin/kstack.git

`install.sh` copies `global/` then the selected project into `~/.cursor/skills`. Allowlist: `global`, `lighthouse`, `lightmind`. A new project name needs `<project>/` (even a `.gitkeep`) and an allowlist entry in `install.sh`.

Lock-owned inventory: [lock.json](lock.json).

**Done when:** the Origin URL, project name, and allowlist entry are decided.

## 2. App repo `.cursor` scripts

After product setup (for example `npm ci`), append this block to `.cursor/install.sh`. Replace `<project>` with the allowlisted name.

Origin-primary Cloud envs inject `url.*.insteadOf` for `origin.cursor.com`; clone then 403s because helpers never run. Unset those keys first. GitHub-primary envs have no matching keys — the loop is a no-op.

```bash
rm -rf /tmp/kstack
: "${CURSOR_API_KEY:?CURSOR_API_KEY secret missing; needed to clone Origin kipyin/kstack}"
export PATH="/exec-daemon/tools:${HOME}/.local/bin:${PATH}"
if ! command -v origin >/dev/null 2>&1; then
  curl -fsSL https://downloads.cursor.com/origin/install.sh | sh
fi
while IFS= read -r key; do
  git config --global --unset-all "$key" || true
done < <(git config --global --name-only --get-regexp '^url\..*origin\.cursor\.com' || true)
if ! origin auth login --api-key "$CURSOR_API_KEY"; then
  echo "origin auth login failed." >&2
  exit 1
fi
if ! origin repo clone kipyin/kstack /tmp/kstack; then
  echo "origin repo clone of kipyin/kstack failed." >&2
  exit 1
fi
bash /tmp/kstack/install.sh <project>
```

**Done when:** the app's `.cursor/install.sh` unsets Origin `insteadOf`, clones `kipyin/kstack` to `/tmp/kstack`, and runs `install.sh <project>`.

### `.cursor/start.sh`

Same unset loop is best-effort. Cloud Agent session bootstrap may reinject those keys after `start.sh` exits, so this does not keep `insteadOf` clear for the whole session. The install-time unset is what matters (skills baked into the snapshot).

For a mid-session sibling Origin clone, unset those keys (or use a clean `GIT_CONFIG_GLOBAL`) immediately before `origin repo clone`.

```bash
while IFS= read -r key; do
  git config --global --unset-all "$key" || true
done < <(git config --global --name-only --get-regexp '^url\..*origin\.cursor\.com' || true)
```

**Done when:** the app's `.cursor/start.sh` includes the Origin `insteadOf` unset (best-effort).

## 3. Cloud env

- **Install script:** `bash .cursor/install.sh`
- **Start:** `bash .cursor/start.sh` (best-effort Origin `insteadOf` unset; plus whatever the app needs)
- **Secret `CURSOR_API_KEY`:** Environment scope, Runtime Secret (not Personal / My Secrets — those are unavailable during Builds). Value is the Cursor User API key from cursor.com/dashboard/api.

**Done when:** the environment runs that install script and start script, and `CURSOR_API_KEY` is an Environment Runtime Secret.

## 4. Prove

Merge to the environment's build branch. Run a non-draft rebuild.

**Done when:** the install log shows Origin clone OK, `Installed skills (<project>)`, exit 0, and the snapshot is active.

## 5. Optional smoke

Run one Cloud Agent and list `~/.cursor/skills`. Cross-check lock-owned names against [lock.json](lock.json). Missing lock-owned folders means pins were not materialized in this repo before the clone — refresh from the Mac checkout ([README.md](README.md)) and push.

**Done when:** `~/.cursor/skills` has the first-party globals, the selected project's folders, and every lock-owned name in `lock.json`.

## This repo's own Cloud Agent environment

When a Cloud Agent works **on kipyin/kstack itself**, the workspace already is this checkout. Do not clone to `/tmp/kstack` and do not set `CURSOR_API_KEY` for skills.

- **Install script:** `bash /workspace/.cursor/install.sh` (build-time: CLI, `install.sh global`, and identity)
- **Start script:** `bash /workspace/.cursor/start.sh` (session-time identity: install house `commit-msg` immediately, then keep re-applying after Cursor plants `~/.cursor/agent-hooks` or resets `core.hooksPath` / git user)
- Use absolute `/workspace/...` paths, not relative `.cursor/...`. The per-boot **start** step runs from `$HOME`, not the workspace root, so a relative `bash .cursor/start.sh` exits 127 and the Kip identity + strip hook never get re-applied.
- That install script runs `npm ci` and `npm run build` in `packages/kstack` so the CLI is on the VM, then `install.sh global` from the workspace (no `/tmp` clone).
- Mac humans still use [README.md](README.md) (`kstack link`).

App repos keep using section 2: unset `insteadOf` then clone at install (start.sh unset is best-effort).
