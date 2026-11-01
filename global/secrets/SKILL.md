---
name: secrets
description: >-
  Use when a task needs a password, token, key, or DB credential, or when storing a new one.
---
# Secrets

Secrets live in Kip's Bitwarden vault and reach work only through the `bw` CLI or a chmod-600 env file. A secret's value stays inside the command that uses it; everywhere else you speak by **entry name**.

## Session

`BW_SESSION` comes from `~/.config/bw-session.env`, which must contain an **exported** variable:

```
export BW_SESSION=...
```

It is sourced, not inherited. Either `set -a; . ~/.config/bw-session.env; set +a` at the start of the command, or rely on a shell rc that does it. Check with `bw status` → `"status":"unlocked"`.

If locked: `bw unlock --raw` prints a fresh token — write it to that same file as `export BW_SESSION=...`, `chmod 600`. Never ask Kip for the master password and never handle it yourself.

Reusable helper for a task: `[ -n "${BW_SESSION:-}" ] || { set -a; . ~/.config/bw-session.env; set +a; }`.

## Fetch

1. Find by name, names only: `bw list items --search '<name>' | jq -r '.[].name'`.
2. Use by name, piped straight into the consumer: `PGPASSWORD="$(bw get password '<name>')" psql ...`, `bw get username '<name>'`, `bw get notes '<name>'`. Done when the command succeeded and nothing secret was printed.
3. GitHub App private keys are read as **notes** by `~/gh-apps/bin/gh-app-token`; never call `bw get notes` for those yourself — go through `gh-as <bot>`.
4. Repeated use: `KEY=value` lines into `~/.secrets/<purpose>.env`, `chmod 600`, then `set -a; . file; set +a`. Verify with `stat -f %Lp <file>` (macOS) → `600`.

## Guardrails

- Values go only into tool processes and 600 env files. Chat, messages to Kip, email, issues, PRs, prompts, memory, and logs get the **entry name** instead. To show a file, redact: `sed -E 's/=.*/=<redacted>/'`.
- If the agent runs somewhere else (an InstaBox sandbox, a remote SSH host), the local vault is not reachable from there. Pass the variable **name** in the prompt and export the value on the machine that actually runs the command — the secret never rides in the prompt or the repo.
- Demo / 245 database: connect as the `postgres` account (`~/.secrets/245-pg-admin.env`), not `agent`.
- Entry missing or wrong: ask Andrew O. (infra owner) in Chinese, naming the entry and what it is for, e.g. 「Bitwarden 里缺 `<名称>`（用于 <用途>），能补一下吗？」. Never invent a value, never borrow one from another file.
- New secret from Kip: store it under a clear entry name and say the name back.
