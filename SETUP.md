# Cloud Agent skills

Wire a new app repo's Cloud Agent environment to this Origin repo. Skills stay here; the environment clones and copies them.

Mac checkouts use [README.md](README.md) (`kstack link`). This page is the Cloud copy path.

## 1. Source

https://origin.cursor.com/kipyin/kstack.git

`install.sh` copies `global/` then the selected project into `~/.cursor/skills`. Allowlist: `global`, `lighthouse`, `lightmind`. A new project name needs `<project>/` (even a `.gitkeep`) and an allowlist entry in `install.sh`.

Lock-owned inventory: [lock.json](lock.json).

**Done when:** the Origin URL, project name, and allowlist entry are decided.

## 2. App repo `.cursor/install.sh`

After product setup (for example `npm ci`), append this block. Replace `<project>` with the allowlisted name.

```bash
rm -rf /tmp/kstack
: "${CURSOR_API_KEY:?CURSOR_API_KEY secret missing; needed to clone Origin kipyin/kstack}"
export PATH="/exec-daemon/tools:${HOME}/.local/bin:${PATH}"
if ! command -v origin >/dev/null 2>&1; then
  curl -fsSL https://downloads.cursor.com/origin/install.sh | sh
fi
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

**Done when:** the app's `.cursor/install.sh` clones `kipyin/kstack` to `/tmp/kstack` and runs `install.sh <project>`.

## 3. Cloud env

- **Install script:** `bash .cursor/install.sh`
- **Start:** as the app needs
- **Secret `CURSOR_API_KEY`:** Environment scope, Runtime Secret (not Personal / My Secrets — those are unavailable during Builds). Value is the Cursor User API key from cursor.com/dashboard/api.

**Done when:** the environment runs that install script and `CURSOR_API_KEY` is an Environment Runtime Secret.

## 4. Prove

Merge to the environment's build branch. Run a non-draft rebuild.

**Done when:** the install log shows Origin clone OK, `Installed skills (<project>)`, exit 0, and the snapshot is active.

## 5. Optional smoke

Run one Cloud Agent and list `~/.cursor/skills`. Cross-check lock-owned names against [lock.json](lock.json). Missing lock-owned folders means pins were not materialized in this repo before the clone — refresh from the Mac checkout ([README.md](README.md)) and push.

**Done when:** `~/.cursor/skills` has the first-party globals, the selected project's folders, and every lock-owned name in `lock.json`.
