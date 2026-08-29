# Cloud copy path

[README.md](README.md) has both the Mac and Cloud paths. This page is the Cloud copy deep page.

Mac checkouts use [README.md](README.md) (`kstack link`). Cloud Agents working on this repo skip the clone. Use [This repo's own Cloud Agent environment](#this-repos-own-cloud-agent-environment).

## 1. Source

Public install URL: https://github.com/kipyin/kstack

Origin (agent-managed source of truth): https://origin.cursor.com/kipyin/kstack.git

Clone GitHub with ordinary git. No Cursor API key.

[install.sh](install.sh) copies `global/` then the selected project into `~/.cursor/skills`. A new project name needs a folder (even a `.gitkeep`) and an allowlist entry in that file.

Lock-owned inventory: [lock.json](lock.json).

**Done when.** The GitHub URL and project name are decided, and that name is in [install.sh](install.sh).

## 2. App repo `.cursor/install.sh`

After product setup, clone GitHub kstack onto a path that survives the snapshot, then run [install.sh](install.sh). Point at that file rather than pasting it.

```
KSTACK_DIR="${HOME}/.cursor/kstack"
rm -rf "$KSTACK_DIR"
GIT_TERMINAL_PROMPT=0 git clone --depth 1 https://github.com/kipyin/kstack.git "$KSTACK_DIR"
bash "$KSTACK_DIR/install.sh" <project>
```

`/tmp/kstack` is enough if you only need the skill copy baked at install. Session start needs the identity hook files, and those scripts locate `commit-msg` relative to the kstack root, so keep the checkout layout (`.../kstack/.cursor/hooks/...`).

Origin-primary Cloud envs inject `url.*.insteadOf` for `origin.cursor.com`. GitHub clone does not need that. Unset those keys only if you still `origin repo clone` a sibling.

**Done when.** The app's `.cursor/install.sh` clones `https://github.com/kipyin/kstack.git` and runs `install.sh <project>`.

## 3. App repo `.cursor/start.sh`

Reapply identity from the durable checkout. Pattern: [`.cursor/start.sh`](.cursor/start.sh) (run the hook immediately, then the keeper).

```
bash "${HOME}/.cursor/kstack/.cursor/hooks/install-identity.sh"
```

[`.cursor/hooks/install-identity.sh`](.cursor/hooks/install-identity.sh) reads:

- `GIT_AUTHOR_NAME` and `GIT_AUTHOR_EMAIL`. Both set becomes `user.name` / `user.email`. Either missing leaves Cursor's author.
- `GIT_SIGNING_KEY`. OpenSSH PEM or base64 enables house SSH signing. Unset leaves `commit.gpgsign` false. Install and start still succeed.

Product secrets stay in the app repo. Lightmind keeps `LIGHTMIND_*` there.

**Done when.** Session start runs that identity hook.

## 4. Cloud env

- Install script: `bash .cursor/install.sh`
- Start: `bash .cursor/start.sh`. Use an absolute path if the start step runs from `$HOME`.
- Optional Runtime secrets: `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL`, `GIT_SIGNING_KEY`
- Product secrets on the app env, not in kstack

**Done when.** The environment runs those scripts and has the identity secrets you want.

## 5. Prove

Merge to the environment's build branch. Run a non-draft rebuild.

**Done when.**

- Install log shows the GitHub clone and `Installed skills (<project>)`, exit 0.
- Smoke commit author (`git log -1 --format='%an <%ae>'`) matches `GIT_AUTHOR_*` if set, else Cursor's default.
- `git log -1 --format='%G?'` is `N` when `GIT_SIGNING_KEY` was unset. GitHub shows Verified only when the key was set.

## 6. Optional skills smoke

Run one Cloud Agent and list `~/.cursor/skills`. Cross-check lock-owned names against [lock.json](lock.json). Missing lock-owned folders means pins were not materialized in this repo before the clone. Refresh from the Mac checkout ([README.md](README.md)) and push.

**Done when.** `~/.cursor/skills` has the first-party globals, the selected project's folders, and every lock-owned name in `lock.json`.

## This repo's own Cloud Agent environment

When a Cloud Agent works on kipyin/kstack itself, the workspace already is this checkout. Skip the GitHub clone.

- Install script: `bash /workspace/.cursor/install.sh` (build-time: CLI, `install.sh global`, and identity)
- Start script: `bash /workspace/.cursor/start.sh` (session-time identity: install house `commit-msg` immediately, then keep re-applying after Cursor plants `~/.cursor/agent-hooks` or resets `core.hooksPath` / git user)
- Use absolute `/workspace/...` paths, not relative `.cursor/...`. The per-boot start step runs from `$HOME`, not the workspace root, so a relative `bash .cursor/start.sh` exits 127 and identity never gets re-applied.
- That install script runs `npm ci` and `npm run build` in `packages/kstack` so the CLI is on the VM, then `install.sh global` from the workspace.

Mac humans still use [README.md](README.md) (`kstack link`).
