# kstack

Skills plus portable git identity for Cursor agents.

GitHub is the source of truth for writes and installs: https://github.com/kipyin/kstack

Clone with ordinary git. No Cursor API key.

Two ways in: symlink on a Mac, copy on a Cloud Agent environment.

| | Mac | Cloud |
| --- | --- | --- |
| Checkout | `~/Code/kstack` | GitHub clone in the app's `.cursor/install.sh` |
| Skills | `kstack link` (symlink) | [install.sh](install.sh) copies into `~/.cursor/skills` |
| Identity | your local git config | env vars, reapplied by the app's `start.sh` |

This repo's own Cloud env skips the clone. The workspace already is the checkout. Long form: [SETUP.md](SETUP.md).

[install.sh](install.sh) never fetches packages. Refresh pinned third-party skills with `kstack sync` / `update` / `add` on a machine that can reach the sources.

## Local (Mac)

1. Clone to `~/Code/kstack`.

```
git clone https://github.com/kipyin/kstack.git ~/Code/kstack
```

**Done when.** `~/Code/kstack/kstack.toml` exists.

2. Build and link the CLI, then symlink skills.

```
cd ~/Code/kstack/packages/kstack && npm install && npm run build && npm link
cd ~/Code/kstack && kstack link
```

`kstack link` links the shared instructions as well as skills. It preflights instruction destinations before touching skills; existing instruction files and unrelated symlinks stop the command. To review and migrate those files, see [Shared agent instructions](#shared-agent-instructions).

For skill directories, `kstack link` replaces existing symlinks. A real directory in the way fails the command; `--force` deletes that directory. `--force` never replaces instruction files.

Where symlinks go: [kstack.toml](kstack.toml). Override with `--repo`, `--config`, `KSTACK_REPO`, or `KSTACK_CONFIG`.

**Done when.** Skills are linked and this prints `linked`:

```
test -L ~/.cursor/skills/secrets && echo linked
```

`kstack status` ending in `status  clean` is the fuller check.

## Shared agent instructions

[global/AGENTS.md](global/AGENTS.md) is the shared source for the instruction links in [kstack.toml](kstack.toml): Codex, Claude Code, Grok Build, Gemini CLI, OpenCode, Copilot CLI, and the home-directory ancestor entry used by Pi and Cursor Agent. Each configured destination is a symlink to the same file; updates to the checkout immediately affect new sessions. The paths are explicit: edit `[instructions].paths` when a harness uses a custom home directory, or remove an entry for a harness you do not use. The `~` and `${HOME}` forms are supported.

Before replacing an existing instruction file, review the proposed links and migrate any harness-specific content. The current shared file contains the RTK output instructions as ordinary Markdown, so it does not depend on Claude's `@` import syntax. Review any existing includes and keep the parts you need before proceeding.

```sh
kstack link --dry-run                                      # preview instruction links
kstack link --instructions-only --backup-instructions      # save conflicts, then link
kstack status                          # check instruction and skill links
```

Existing files and unrelated links are saved as `<path>.kstack-backup` only when `--backup-instructions` is supplied. The command refuses directories and existing `.kstack-backup` files, even with `--force`. It does not merge or automatically apply the backed-up contents. If Codex has an `AGENTS.override.md`, or Pi has an `AGENTS.override.md` in its agent directory, that file takes precedence over the shared link. Symlinks require a checkout that remains present. Restart each harness after linking. Claude Code's Cowork sessions may skip user files that are symlinks outside the session workspace.

The `~/AGENTS.md` link covers workspaces below the home directory for harnesses that scan ancestors. Pi loads it there; for Pi workspaces outside home, add `~/.pi/agent/AGENTS.md` to `[instructions].paths`. Pi 1.4.0 loads both paths separately when both are configured and the workspace is below home. The installed Cursor Agent's local rules loader walks ancestor directories and follows files there, but Cursor documents `AGENTS.md` as project-scoped; loading this file in all Cursor surfaces and workspaces outside home has not been verified. Cursor's global user rules use a different mechanism. The Cloud installer below copies Cursor skills only and does not modify user instruction files.

## Cloud env build

Wire an app's Cloud Agent environment so it copies skills and reapplies identity. Point at the files in this repo rather than pasting [install.sh](install.sh) into the app. Long form: [SETUP.md](SETUP.md).

[`.cursor/hooks/install-identity.sh`](.cursor/hooks/install-identity.sh) is the identity contract. [`.cursor/start.sh`](.cursor/start.sh) is the reapply pattern.

1. In the app's `.cursor/install.sh`, after product setup, clone GitHub kstack and copy skills. Replace `<project>` with a name [install.sh](install.sh) accepts: `global`, `lighthouse`, `lightmind`, `lighthub`, `xharness`, `lightology`, `eloquent`, `pwc-graphic-elements`, or `lighthouse-gi-solvency`.

```
KSTACK_DIR="${HOME}/.cursor/kstack"
rm -rf "$KSTACK_DIR"
GIT_TERMINAL_PROMPT=0 git clone --depth 1 https://github.com/kipyin/kstack.git "$KSTACK_DIR"
bash "$KSTACK_DIR/install.sh" <project>
```

**Done when.** The app's `.cursor/install.sh` clones `https://github.com/kipyin/kstack.git` and runs `install.sh <project>`.

2. In the app's `.cursor/start.sh`, reapply identity from that checkout. Keep the clone on a path that survives the snapshot so start can call the real hook.

```
bash "${HOME}/.cursor/kstack/.cursor/hooks/install-identity.sh"
```

This repo's [`.cursor/start.sh`](.cursor/start.sh) also starts a keeper after Cursor plants `~/.cursor/agent-hooks`.

**Done when.** Session start runs the identity hook.

3. Optional environment Runtime secrets on the app's Cloud env. Product secrets stay on the app. Lightmind keeps `LIGHTMIND_*` there.

| Variable | If set | If unset |
| --- | --- | --- |
| `GIT_AUTHOR_NAME` and `GIT_AUTHOR_EMAIL` | both become `user.name` / `user.email` | leave Cursor's author |
| `GIT_SIGNING_KEY` | OpenSSH PEM or base64. House SSH signing on | `commit.gpgsign` false. Install and start still succeed |

Put `GIT_SIGNING_KEY` in the Cloud env secret, not in git.

**Done when.** The env has the identity secrets you want, and product secrets remain in the app repo.

4. Rebuild and prove.

**Done when.** Rebuild log shows the GitHub clone and `Installed skills (<project>)`, exit 0. A smoke commit's author is the configured `GIT_AUTHOR_*` pair, or Cursor's default if those vars were unset. The commit is Verified only when `GIT_SIGNING_KEY` was set. Unsigned otherwise.

## Commands

```
kstack list [dir]
kstack status
kstack link [--force] [--backup-instructions] [--instructions-only] [--dry-run]
kstack sync [pkg]              # rewrite owned folders at the current pin
kstack update [pkg|skill]      # bump pin, then rewrite owned folders
kstack add <source> --scope global|lighthouse|lightmind|lighthub|xharness|lightology [--skill name]...
```

`sync` / `update` only touch folders listed in [lock.json](lock.json). Hand-written skills are left alone.

Keep project-only skills out of `global/`.
