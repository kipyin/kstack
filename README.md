# kstack

My personal skill management repo. This repo is the Single Source of Truth for all projects.

There are two ways to use this repo: manage local skills, and install them on a Cursor Cloud environment.


| | Mac | Cloud |
| --- | --- | --- |
| Checkout | `~/Code/kstack` | clone to `/tmp/kstack` ([SETUP.md](SETUP.md)) |
| Install | `kstack link` (symlink) | `./install.sh [global\|lighthouse\|lightmind]` (copy) |

This repo's own Cloud env: `bash .cursor/install.sh` (workspace already is the checkout; no second clone).

`install.sh` never fetches. Refresh pinned third-party skills with `kstack sync` / `update` / `add` on a machine that can reach the sources.

## Use `kstack` on Mac

```
origin repo clone kipyin/kstack ~/Code/kstack
cd ~/Code/kstack/packages/kstack && npm install && npm run build && npm link
cd ~/Code/kstack && kstack link
```

`kstack link` replaces existing symlinks. A real directory in the way fails the command. `--force` deletes that directory — only use it if you mean to throw the copy away.

Where symlinks go: [kstack.toml](kstack.toml). Override with `--repo`, `--config`, `KSTACK_REPO`, or `KSTACK_CONFIG`.

## Set up on Cursor Cloud (let an agent do it!)

```
origin repo clone kipyin/kstack /tmp/kstack
bash /tmp/kstack/install.sh              # global only
bash /tmp/kstack/install.sh lighthouse   # global + lighthouse/
```

New Cloud Agent env: [SETUP.md](SETUP.md).

## Commands

```
kstack list [dir]
kstack status
kstack link [--force]
kstack sync [pkg]              # rewrite owned folders at the current pin
kstack update [pkg|skill]      # bump pin, then rewrite owned folders
kstack add <source> --scope global|lighthouse|lightmind [--skill name]...
```

`sync` / `update` only touch folders listed in [lock.json](lock.json). Hand-written skills are left alone.

Keep project-only skills out of `global/`.
