# Cloud Agent environment setup (skills)

When you have a new app repo and a new Cursor Cloud Agent environment that needs skills, follow this SOP. Do not vendor skills into the app repo.

## 1. Skills source

This repo on Origin is the skills source:

https://origin.cursor.com/kipyin/skills.git

Layout:

- `global/` — extras installed on every environment
- `<project>/` — extras for that project only

Today the install allowlist is `global|lighthouse|lightmind`. For a new project name, add `<project>/` (even a `.gitkeep`) and allowlist it in `install.sh` if needed.

## 2. App repo `.cursor/install.sh`

After product setup (for example `npm ci`), append this block. Replace `<project>` with the project name (`global`, `lighthouse`, `lightmind`, or a newly allowlisted name).

```bash
rm -rf /tmp/skills
: "${CURSOR_API_KEY:?CURSOR_API_KEY secret missing; needed to clone Origin kipyin/skills}"
export PATH="/exec-daemon/tools:${HOME}/.local/bin:${PATH}"
if ! command -v origin >/dev/null 2>&1; then
  curl -fsSL https://downloads.cursor.com/origin/install.sh | sh
fi
if ! origin auth login --api-key "$CURSOR_API_KEY"; then
  echo "origin auth login failed." >&2
  exit 1
fi
if ! origin repo clone kipyin/skills /tmp/skills; then
  echo "origin repo clone of kipyin/skills failed." >&2
  exit 1
fi
bash /tmp/skills/install.sh <project>
```

`install.sh` pulls Matt Pocock official skills via `npx`, then copies `global/` plus `<project>/`. Do not vendor skills into the app repo.

## 3. Cloud env

- **Install script:** `bash .cursor/install.sh`
- **Start:** as the app needs
- **Secret `CURSOR_API_KEY`:** Environment scope, Runtime Secret (not Personal / My Secrets — those are not available during Builds). Value is the Cursor User API key from cursor.com/dashboard/api.

## 4. Prove

Merge to the environment’s build branch. Run a non-draft rebuild. Confirm the install log shows Origin clone OK, `Installed skills (<project>)`, exit 0, and the snapshot is active.

## 5. Optional smoke

Run one Cloud Agent and check `~/.cursor/skills`.
