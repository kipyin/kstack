---
name: instabox
description: Use when the user wants a cloud Linux box (instabox sandbox) from the terminal with the `instabox` CLI — create one, SSH in, run a command in it, read its files, set its idle auto-pause, or delete it, to run a repo's tests in CI (GitHub Actions: a box per job, or a self-hosted runner), or to report a problem with instabox itself (`instabox feedback`). For saving or restoring a box's disks, see instabox-snapshots.
metadata:
  installed-by: instabox
---

# instabox CLI

An instabox sandbox is a Linux VM (Debian, one user with passwordless sudo: named after your local username when created with `instabox create`, `user` from the dashboard, `dev` on older boxes; `instabox get <box>` shows it). It has a root disk and a persistent `/data` disk; HOME is `/data/home`. Each box belongs to an organization; access follows its membership and sandbox permissions.

## Sign in

```sh
instabox whoami              # who is signed in (fails if nobody)
instabox login               # device code: open the printed page, enter the code
```

A GitHub sign-in and a Google sign-in with the same verified email share one account; with different emails they are separate accounts with separate boxes. Both `instabox login` and `npx instabox@latest` sign in with a device code: they print a page and a code (and open the page when there is a browser); the user opens it on any device, enters the code and chooses GitHub or Google there. It works the same over SSH or on a machine without a browser. Relay the page and the code to the user and wait; the command finishes on its own. For Google directly, use `instabox login --provider google`, or `npx instabox@latest --google`. The CLI shares the sign-in `npx` made.

`instabox update` replaces the CLI with the server's current build (it prints "already up to date" when it is); run it when a command the docs describe is missing. `instabox completion bash|zsh|fish|powershell` prints a shell completion script for the user's shell startup file.

For CI or an agent without a browser, use an API key instead: `export INSTABOX_API_KEY=ibk_...` (the user creates it in the dashboard: API keys in the sidebar). Never print, commit or log a key.

## Templates

`agent-browser` is the default, so `create` needs no `--template` for ordinary work. It is Debian 13 (trixie, amd64, kernel 6.18.54) with git, gh, Node.js 22 (npm, pnpm, Yarn), Bun, Python 3.13 (`python3 -m venv`, pip, uv), Go, Rust, a C toolchain, Docker, Claude Code and Codex, plus a desktop (VNC, Chromium) ready for browsing or driving a GUI from the start, on a 16 GiB root disk and a 20 GiB persistent disk at `/data`. The dashboard shows it as **standard**. Pick another template only for its one purpose:

- `universal`: the same tools without the desktop, which installs itself the first time it is used (about half a minute); a smaller root disk. The dashboard shows it as **basic**.
- `herdr`: for the herdr client. The dev tools (gh, Node.js 22, Python 3.13 with venv and pip, Claude Code, Codex, the desktop) without Docker, uv, Go, Rust or a C toolchain; an 8 GiB root disk.
- `orca`: for Orca desktop and mobile. The same tools as `herdr` plus the Orca runtime instead of herdr; an 8 GiB root disk.
- `t3`: for the T3 Code desktop and mobile clients. `universal` plus the T3 Code server (port 3774); a 16 GiB root disk.

`instabox templates` lists the ones this server offers, one row per version with a description; its TAG column (`--json`: `"latest"`, `"default"`) marks the version `create` gets for `--template T` alone (latest) and with no `--template` (default). Pin another version with `--template T@VERSION` (or `--template-version`). `--json` also lists retired ones with `"creatable": false`, which no new box can start from. The free plan creates boxes from `agent-browser` only: another template is refused with `403 template_not_allowed` and needs a paid plan (the user upgrades on the dashboard). A box from a snapshot (`--snapshot`) works on every plan, whatever template the snapshot came from. Do not retry another template on the free plan; use `agent-browser`. Over the HTTP API, `POST /v1/machines` with an unknown `templateId` is `400 bad_request` whose message lists the templates your plan can create from, and a version that template does not have (`agent-browser@nope`, or `templateVersion`) is `400 bad_request` listing its versions newest first, the one you get without a version tagged `(latest)` or `(default)`; a body field the API does not have is `400 unknown_field` naming the closest real one (`template`: did you mean `templateId`?); `name` may be left out (`box-` and 8 random hex digits).

## Sizes

A box is 4 vCPU / 8 GB of memory unless `create` names another size of the account's plan with both `--vcpus` and `--mem-mib`:

| Plan | Sizes (`--vcpus` / `--mem-mib`)               |
| ---- | --------------------------------------------- |
| Free | 4 / 8192 (default)                            |
| Pro  | 2 / 4096, 4 / 8192 (default), 8 / 16384       |
| Team | 2 / 4096, 4 / 8192 (default) up to 32 / 65536 |

`instabox whoami --json` lists the sizes this account may create as `allowedSpecs` (the default first, then the plan's others and any an admin granted); check it rather than assuming the plan. Another size is refused with `400 spec_not_allowed`, whose message names the account's sizes. Pick a size for the work: 2 vCPU (paid plans) for light editing or a single agent, the default for most builds, 8 vCPU (paid plans) for heavy builds or many processes. `--snapshot` takes the same flags. A paid box moves to another of the plan's sizes while stopped (`instabox resize <box> --vcpus N --mem-mib M [--restart]`, applied at its next start; that start fails with `no_capacity` if its host has no room for the new size, or `host_unavailable` if the host's node-agent cannot resize yet, and the box stays stopped at the new size); a free box's size is fixed.

## Everyday commands

```sh
instabox templates                              # base systems to start from
instabox create --name work                     # new box; waits until it is running
instabox create --name work --setup-file ./setup.sh   # then runs the script in it
instabox ls                                     # your boxes and their states
instabox ssh work                               # interactive shell (leave with: exit)
instabox exec work -- uname -a                  # one command, no SSH client needed
instabox exec work --cwd /data/home -- ls -la   # exec runs `bash -lc` as the box's user
instabox run -- make -v                         # one-shot: new box, run, delete it, exit with the code
instabox ps work                                # its processes: pid, ppid, user, %cpu, %mem, elapsed, command
instabox files work /data/home                  # list a directory (or print a text file)
instabox push work ./app                        # copy a file or directory in (to /data/home/app)
instabox pull work /data/home/app/out.log       # copy a file or directory out (to ./out.log)
instabox cp ./x.tgz work:/data/home/x.tgz       # scp-style, either way (cp work:/data/home/x.tgz .)
instabox auto-suspend work 10m                  # idle time before a paid box pauses
instabox max-run work 120                      # pause a paid box after two running hours
instabox max-run work -1                       # remove the runtime cap; idle policy still applies
instabox stop work && instabox start work       # stop ends processes, keeps disks
instabox suspend work && instabox resume work   # pause/resume keeps running processes
instabox restart work                           # power-cycle a hung box (stop, start); disks kept
instabox rename work api                        # rename in place, any state; ID and port URLs stay
instabox rm --yes work                          # delete the box (without --yes it asks y/N)
```

- Names or IDs (`m_...`) both work wherever `<id-or-name>` is accepted.
- `create` options: `--template T` or `--snapshot S`, `--vcpus N --mem-mib M` (a size of the plan, see Sizes), `--auto-suspend D|0`, `--max-run-minutes N`, `--delete-after D` (delete it D after creation, 1m-24h, whatever its state), `--meta K=V`, `--org O`, `--secrets all|NAME,NAME|none`, `--no-wait`, `--setup-file PATH|-` (`--wait-setup`), `--fail-fast` (when no host has room, fail at once and create nothing instead of failing the create after; with `--snapshot`, instead of creating it stopped).
- `create --setup-file PATH` (`-`: stdin; at most 64 KB) runs that script in the new box once it is running, in HOME as the box's user (by its `#!` line, else with bash; CRLF line endings become LF), and prints its output; it replaces create + push + exec for provisioning. A failing script makes `create` exit with the script's code and keeps the box: debug it with `instabox exec work -- /tmp/instabox-setup.sh`. With `--json` the sandbox object gets a `setup` object (`exitCode`, `stdout`, `stderr`, `signal`, `timedOut`, `truncated`, `durationMs`). `create` always waits for the script (`--wait-setup` names that; `=false` is refused) and keeps its state in the box's metadata, so `instabox get work --json` shows it later: `metadata.setupStatus` (`pending`, `running`, `succeeded`, `failed`), `setupExitCode` (`124`: timed out) and `setupLog` (the last 512 characters of its stdout then stderr). The script is killed after `--setup-timeout` (default and at most 10m); for longer installs, use `ssh`. A missing, empty or over-64 KB file is refused before any box is created. `run --setup-file` does the same before its command, with its `-e` variables; when the script fails, run's `--json` `exitCode` is the script's. The script stays at `/tmp/instabox-setup.sh` (and in snapshots), so keep credentials out of it.
- Idle auto-pause defaults to 30 minutes. Paid boxes allow 5, 10, 15, 20, 25 or 30 minutes (a time between rounds up; below 5m or above 30m is refused, nothing created), or `0` to turn it off. Free boxes keep 30 minutes unless an admin grants an idle override; asking another value on a free box fails (`permission_denied`, nothing created), so leave `--auto-suspend` out there. Idle means no agent working, no terminal use and little CPU.
- Max run minutes is independent of idle activity: `-1` is unlimited, `0` pauses immediately, and a positive integer forces a pause after that many running minutes. Free boxes have a fixed 480-minute cap that only an admin session can change; paid boxes default to `-1` and can change it. An idle override does not permit changes to a free box's runtime cap. The first limit reached pauses the box; both timers restart after sleep and wake.
- A runtime pause blocks every wake path during a server-configured cooldown, 10 minutes by default. Wait until the `cooldownUntil` deadline shown by `instabox get`; edits cannot clear it. Afterward, an automatically paused box wakes on `exec`, `ssh`, `files`, a public port request or `instabox wake <box>`. A zero runtime cap must be changed before waking. A normal pause preserves memory and processes.
- `sudo reboot` inside a box reboots it: `instabox get` shows `starting`, then `running` (same disks, processes gone); wait for `running` before the next `exec`. `sudo poweroff` inside stops it until `instabox start`. Boxes from older template versions stop on a reboot too: start them.
- If `exec`/`ssh` stop answering (hang or time out on a running box), run `instabox restart <box>` (alias `recover`; `--timeout 20s` shortens the wait, `--json` prints the box). It stops the box, killing the VM if it has not shut down by the timeout (60 seconds by default), then starts it and waits until it runs. Files on the root disk and `/data` stay; processes do not, so start your servers again. A paused box is not hung: resume it. A box stuck in `starting` with no start in progress cannot be restarted; restart says so.
- Disk full (`df -h /data`)? Grow it with `instabox resize <box> --disk N` (`/data`, where HOME is), in GB. A running box grows online, no restart. A shrink, a paused box, or an image that can't grow online needs `--restart` (it stops the box, resizes the disk and starts it again; files stay, processes do not), else resize changes nothing and says so. A shrink must fit your data plus 10% (at least 1 GB), else it's refused (`disk_too_small`) and nothing changes. Free-plan boxes keep their size. The system disk (`/`) is the template's; you can't grow it.
- Need more CPU or memory? A paid box moves to another of its plan's sizes with `instabox resize <box> --vcpus N --mem-mib M` (Pro: 2/4096, 4/8192, 8/16384), while it is stopped; add `--restart` on a running box, and run that from outside the box (from inside, the stop would end the command before the start, so resize refuses it; the same goes for a shrink with `--restart`). A size the plan does not have is refused before anything stops. The new size applies at the next start; free-plan boxes keep theirs.
- Use `exec` to run a command and read its output, and `ssh` for an interactive shell.
- Use `cp`, `push` and `pull` to move files, not `echo <base64> | base64 -d` over `exec`. `cp LOCAL work:PATH` and `cp work:PATH LOCAL` copy either way (`-r` for directories). `push work LOCAL [REMOTE]` copies a file or directory to REMOTE (default: HOME); an existing directory or a path ending in `/` receives it under its own name. REMOTE's parent directory must exist (else `missing_parent`); `-p` creates it. A file streams byte-for-byte, up to 5 GiB, and its sha256 is checked; a directory goes as a gzipped tar of at most 1 GiB. From inside a git repo, a directory push sends only tracked files (`git ls-files -c`); `--all` adds untracked files git does not ignore; `node_modules`, build output and `.git` stay behind. `pull work REMOTE [LOCAL]` copies back the same way: a file streams, any size; a directory is read as root, at most 32 MiB compressed. Over HTTP: `PUT /v1/machines/{id}/files?path=P` with the raw body, `GET /v1/machines/{id}/files/content?path=P`, and `POST /v1/machines/{id}/files/upload-url` for a signed URL that takes the PUT without a key.
- `exec` with one argument after `--` runs it as a shell string (`instabox exec work -- 'ls | wc -l'`); several arguments run as that exact argv, each quoted for you (`instabox exec work -- bash -c 'echo a b > /tmp/x'`).
- For a one-off job that needs no box afterwards, use `instabox run [--template T | --from SNAPSHOT] [--name N] [--push DIR] [--cwd D] [-e K=V ...] [--timeout 60s] [--keep] [--setup-file PATH|-] [--json] -- <cmd...>` instead of create + exec + rm: it deletes the box even when the command fails or the run is interrupted (Ctrl-C, SIGTERM), and exits with the command's code (124: timed out). Its own failures have their own codes: 2 usage, 75 `--fail-fast` and no host has room (retry later), 125 `run` itself failed (API, network, create, upload or cleanup), 130 interrupted; with `--json` they print the `{"error": {...}}` object, except a failed cleanup delete: the result then has `deleted: false` and `cleanup: {"error": {...}}` (stdout is always one JSON document). One argument is a shell string, several an exact argv. The same 10-minute limit as `exec` applies. `--push .` first uploads the current directory's files (those git does not ignore) into the working directory (`--cwd`, default HOME), so `instabox run --push . -- 'go test ./...'` tests your checkout. `--name N` is used as is (1-63 lowercase letters, digits or `-`, starting with a letter or digit; default `run-<8 hex digits>`). A box left behind by a killed CLI is deleted by the server at its `deleteAt`, 5 minutes after its timeout (10 with `--push`, plus another timeout with `--setup-file`); a cleanup delete that gets a 5xx, a retryable error or no answer is retried 5 times with backoff. `--setup-file PATH|-` runs a setup script (at most 64 KB) first, in HOME with the same `--timeout` and `-e` variables (after `--push`); if it fails, `run` exits with its code without running the command. `--keep` keeps the box with no deadline and, once it was created, prints `Kept NAME; delete it with: instabox rm --yes NAME` to stderr (stdout stays the command's; `--json` has it as `sandbox`); a failed create operation prints only its error (one whose wait was cut short is kept, with `Kept NAME, whose create had not finished; …`).
- `instabox ps work [--all] [--json]` lists the processes running in the box (it runs `ps` through exec, so it wakes a box that paused itself and refuses a stopped or manually paused one). Kernel threads and the listing's own processes (its shell, `ps`, `head` and the sshd sessions exec uses) are left out unless `--all`. `--json` prints an array of `{pid, ppid, user, cpuPercent, memPercent, elapsedSeconds, command}`: `instabox ps work --json | jq '.[] | select(.command | test("node"))'`. It lists only what runs now; there is no history of past commands or their output.
- To copy a box (try something risky, or run agents side by side from the same state), use `instabox fork work [--name N] [--count N] [--keep-snapshot] [--json]` (`clone` works too): it saves a snapshot of `work` (live while it runs, where the server allows), creates `--count` boxes (1-5) from it with the same template and size, waits until they run, and deletes the snapshot, also on error or Ctrl-C, unless `--keep-snapshot`. `work` is not changed. Several boxes are named `N-1` to `N-N`. It is snapshot + create, so it takes about as long as those two; each box counts toward the plan's starts a minute, which fork waits out (up to 5 minutes in total). If the source's size is no longer one of the plan's sizes, pass `--vcpus N --mem-mib M`. On a failure part-way it prints which boxes were created; they are kept, so delete those you do not need. `--json` prints `{source, machines, snapshotId, snapshotName, kept, snapshotMs, createMs, totalMs}`.
- `exec` returns the command's exit code and takes `--stdin` to pipe input (any size up to 5 GiB, binary too: `instabox exec work --stdin -- tar -xz -C /data/workspace < src.tgz`). `exec --json` prints one object instead of the raw output (`stdout`, `stderr`, `exitCode`, `signal`, `timedOut`, `truncated`, `invalidUtf8`, `durationMs`) and still exits with the command's code: `instabox exec work --json -- make test | jq .exitCode`. exec output is UTF-8 text: each stream is cut at 1 MiB (`truncated`; `--stream` has no cap) and bytes that are not UTF-8 become U+FFFD (`invalidUtf8`), so never copy a file out with `exec -- cat` (an APK or tarball comes back corrupt); use `pull`/`cp`. A cut is noted on stderr and keeps the exit code; when the command exits 0 but its output was binary, exec says so on stderr and exits 65 (its own code, like 75 and 125, so it never looks like the command's). `exec --stream` prints the output as the command writes it instead of at the end (same timeout and exit code; with `--json`, one `{"type":"stdout"|"stderr","data"}` object per line, then `{"type":"exit","exitCode",...}`), so you can watch a build or test run as it goes. It stops the command after `--timeout` seconds: 60 by default, 600 at most (whole seconds; `run`'s also takes `90s` or `5m`). A larger or unparsable value is a one-line usage error, exit 2. It returns when the command exits, even if it left a process running in the background (`instabox exec work -- 'nohup ./server >server.log 2>&1 &'` returns at once and the server keeps running); background output written later than about a second after the exit is not returned, and a background process that still writes to exec's stdout or stderr after that gets a broken pipe (it may die, or a server may drop requests), so send both to a file (`>log 2>&1`) or use `exec --background`. Run longer commands (installs, builds, test suites) over SSH, which also returns the exit code: `instabox ssh work -- 'cd /data/workspace/app && npm ci'`. The box's runtime cap still applies during SSH or exec.
- For work past 600 s, or to keep going while you do something else, start a background job: `instabox exec --background work -- 'npm run build'` prints a job ID at once (`--json`: `{jobId, pid}`); then `instabox jobs ls work`, `instabox jobs logs work <job> -f` (streams until it ends, exits with its code; Ctrl-C leaves the job running), `instabox jobs wait work <job> [--timeout 30m]` and `instabox jobs kill work <job> [--signal KILL]` (the whole process group). This is the CLI polling over plain exec calls. A job holds no activity lease: only its CPU use, or a running `jobs wait`/`logs -f`, counts as activity, so keep `jobs wait` going for a quiet job you need to finish. A pause freezes the job and it carries on after resume; a stop ends jobs (`exited(143)`, or `lost` after a hard stop).
- A box that does not boot, is unreachable, or failed to start or resume: `instabox logs work` prints its console log (kernel and systemd boot messages) and its last 20 operations with their errors, in any state, without waking it. Add `-f` to follow it or `--json` for `GET /v1/machines/{id}/logs`.
- Output: `--json` (or `-o json`) works on every command (each command's `-h` lists it); `ssh`, `mosh` and `port-forward` are interactive and refuse it with the JSON error code `json_unsupported` (use `exec --json`). With JSON output a failure prints `{"error":{"code","message",...}}` on stdout instead of text on stderr and still exits non-zero (2 for usage errors, code `usage`); API errors keep the server's `code`, `status` and `requestId`. Piped, the list and status commands (`ls`, `get`, `templates`, `usage`, `snapshot ls`, `port ls`, `keys ls`, `secrets ls`, `vault ls`, `workspace ls|get|members|invites`) print JSON on their own, so `instabox ls | jq` works; `--output table` or `INSTABOX_NO_AUTO_JSON=1` keeps the table. `exec`, `ssh`, `files` and the other commands print the same output piped or not.
- The box's HOME has `MACHINE.md` (which box it is, its size, what survives a stop, the installed tools) and `AGENTS.md`, a moment after it starts. They are reference for when a task needs a fact about the box, not steps to run first.
- A public URL for a web server in the box: `instabox port publish work 3000` prints it (`instabox port ls`, `instabox port unpublish work 3000`). The URL works while the box runs.
- A private tunnel instead, only from your computer: `instabox port-forward work 8080:3000` (alias `forward`; `LOCAL` defaults to `REMOTE`, several ports at once) serves the box's port 3000 at `http://127.0.0.1:8080` over SSH and stays in the foreground until Ctrl-C, so start it in the background (`instabox port-forward work 8080:3000 &`) and kill it when done. It fails at once when the local port is busy.

## Organization Secrets

Secrets are encrypted API credentials owned by an org, each limited to the HTTPS hosts it may be sent to. A box that selects a Secret gets a placeholder in its environment, never the credential itself. When a request from the box goes to one of the Secret's allowed hosts over HTTPS, the outbound proxy swaps the placeholder in the request headers for the credential. Code in the box can call the API but cannot read or copy the credential. No header-name configuration is needed.

Secrets suit HTTP API keys and tokens that a client sends in a request header: model providers, GitHub's API, deploy and SaaS APIs. HTTP Basic auth in the `Authorization` header also works, so `git clone` and `git push` over HTTPS work when the Secret's hosts include `github.com` and git gets the placeholder from a credential helper such as `gh auth setup-git`. They do not cover database URLs or passwords, signing keys, or anything a client hashes, signs, encodes some other way or sends outside an HTTPS header; those need their own setup on the box.

Secrets replace the Vault, which is legacy and will be retired: save every new API credential as a Secret, never in the Vault, and do not suggest `vault set`, `set-file` or `import` to users. A new box without `--secrets` still gets an existing user's Vault items (see the last point below). Opt into Secrets with `create --secrets`, or use `secrets select` later. Metadata labels do not select Secrets, and Secrets do not deliver files.

```sh
instabox secrets ls --org team                 # metadata only
instabox secrets show work                     # selection and proxy status
instabox secrets set SERVICE_API_KEY --org team --host api.example.com
instabox secrets import .env --org team --host api.example.com   # every value gets these hosts
instabox create --name app --org team --secrets SERVICE_API_KEY
instabox secrets select work --secrets SERVICE_API_KEY,OTHER_API_KEY
instabox secrets push work                     # refresh the selection on a running box
instabox create --name tenant --no-vault --secrets none
```

- Values for `set` come from stdin or a hidden prompt. Never print a credential or put its value into agent output, chat, command arguments, or logs. Before asking for a credential, check metadata with `secrets ls --org <org>` and `secrets show <box>`. A silent check such as `test "${NAME+x}" = x` tests that the placeholder is present without revealing it; it does not prove the upstream accepts the credential.
- `--host` is optional and repeatable. Give each exact hostname the credential may be sent to; without `--host` (or with `--host '*'`) every public HTTPS destination is allowed. Schemes, ports, paths, IP addresses, and partial wildcards such as `*.example.com` are rejected. Use the service's API host, such as `api.openai.com`, never a guess from the credential's value.
- Org commands default to the signed-in user's personal org. Use `--org` for a team, and select only Secrets from the box's org. Value, host and deletion changes require the org owner/admin: a sign-in, or headless the workspace's own API key with `workspace:admin` in `INSTABOX_API_KEY` (org commands then default to the key's org; `secrets rm` needs `--yes` without a terminal). A personal org's key and keys with only machine scopes can inspect metadata and manage sandbox selections, but cannot change Secret values (`403 missing_scope`). No key or session can retrieve a value.
- `secrets select BOX --secrets` replaces the box's selection: `all`, `none`, comma-separated names, or a JSON array (which allows a Secret literally named `all` or `none`). Keep existing names when adding one.
- Placeholders work only in HTTPS request headers on port 443 to the allowed hosts. Apart from Basic auth in `Authorization`, which the proxy decodes and re-encodes, do not hash, encode, or sign with a placeholder; other traffic carries the placeholder unchanged.
- Rotating a value keeps its placeholder, so running clients need no change. Newly selected names appear in new shells that load the managed environment; restart existing applications to pick them up.
- For a box intended for another person or tenant, disable personal Vault injection with `--no-vault` and select only the org Secrets they may use. For a fresh box with neither system's credentials, use `--no-vault --secrets none`. An empty Secret selection alone still permits Vault injection. These flags do not remove credentials already copied into a source snapshot.
- For an existing box, disable Vault with `start BOX --no-vault` or `resume BOX --no-vault` and clear the Secret selection with `secrets select BOX --secrets none`. Refresh a running guest with both `vault push BOX` and `secrets push BOX`. Vault values already copied into processes or files remain there; disabling Vault does not recover them.
- The Vault is legacy and will be retired; every `vault` command prints a warning. Its commands remain only for items a user already saved: `vault ls`, `show`, `push` and `rm`, and `vault export` to recover a retained item. A box may use Vault and Secrets together; Secrets wins same-named environment variables. Neither store copies or deletes the other. To move a Vault env item that is an HTTP API credential, the user enters its value again as a Secret with its hosts (`secrets set NAME --host HOST` reads it from a hidden prompt), you select it on the box, then `vault rm --yes` it with the user's go-ahead. Never read a Vault value to copy it. Database credentials and other non-HTTP secrets are not supported by Secrets and need their own setup on the box; Vault file items likewise.

## Webhooks (lifecycle events instead of polling)

To be told when a box is ready, pauses, stops, fails or is deleted, register an HTTPS endpoint instead of polling `instabox get`. Each event is a signed POST (Standard Webhooks).

```sh
instabox webhooks create https://example.com/hook --event sandbox.started --event sandbox.error   # prints the signing secret once
instabox webhooks ls
instabox webhooks test wh_...                  # send a webhook.test event now
instabox webhooks deliveries wh_...            # each attempt's status and error
instabox webhooks events                       # the event types
```

- Events: `sandbox.created`, `sandbox.started` (running: ready for exec/SSH, after create, start, resume or wake), `sandbox.stopped`, `sandbox.suspended` (paused, `data.reason` says why: `user`, `idle`, ...), `sandbox.error`, `sandbox.deleted`, `snapshot.created`, `snapshot.failed`, `snapshot.deleted`. No `--event` subscribes to all.
- Verify each request: `webhook-signature` is `v1,<base64 HMAC-SHA256>` of `<webhook-id>.<webhook-timestamp>.<raw body>` keyed with the base64 part of the `whsec_...` secret; reject timestamps over 5 minutes old and dedupe on `webhook-id` (deliveries retry for about a day). Store the secret like any credential; `rotate` gives a new one (the old one signs for 24 hours).
- The URL must be public `https`. The org's owner or admin manages them: signed in, or headless with an API key of that org in `INSTABOX_API_KEY` (`machines:read` lists, `machines:write` changes, `machines:delete` removes; `--org` defaults to the key's org).

## CI (GitHub Actions)

When the user asks to run their CI on instabox, set up `runs-on: instabox-medium` in their repo, end to end. Each job then runs on a fresh Ubuntu 24.04 box (like `ubuntu-latest`) that is deleted when the job ends.

1. Get OWNER/REPO: `gh repo view --json owner,name,visibility --jq '.owner.login+"/"+.name+" "+.visibility'`. Jobs of a public repository are refused; say so and stop if it's public. Then run `instabox ci` (with `--org ORG` for a workspace): if it says GitHub Actions jobs aren't open on this account yet, use the CLI way below instead.
2. Send the user the App link, https://dashboard.instabox.sh/auth/github-app/install (for a workspace other than their personal one, add `?org=ORG_ID` from `instabox workspace ls`; linking takes an owner or admin of it). Ask them to install the App on OWNER, give it access to REPO and link it to the workspace, and wait until they say it's done. You can't do this step for them.
3. Change `runs-on:` of the jobs to move to `instabox-medium` (4 vCPU / 8 GiB), or `instabox-small` (2 / 4) or `instabox-large` (8 / 16) where the plan has them (the free plan runs `instabox-medium` only; any other `instabox` label, `instabox` alone included, is refused). Leave the steps alone; the jobs' secrets stay GitHub Actions secrets, as the box gets none of the user's instabox secrets.
4. Show the user the diff and push only with their OK.
5. Check the first run: `gh run watch`, and `instabox ci` (with `--org ORG` for a workspace) shows each job's state and why it waits or was refused. When nothing is linked, `instabox ci` says so and prints the App install link to send. A job that stays queued on GitHub with nothing in `instabox ci` means the App has no access to REPO; go back to step 2.

For another CI, or a job that must stay on GitHub's runner, a step runs one command in a box with the CLI, with INSTABOX_API_KEY from a CI secret:

```sh
instabox run --push . --timeout 10m -e CI=1 -- 'npm ci && npm test'
```

Both ways, their limits and the reasons a job is refused: https://instabox.sh/docs/ci.md

## Moving work onto a box

To move the repo the user is working in (with its worktrees, uncommitted work and agent conversations) onto a new box and install its dependencies there, follow the `instabox-move-repo` skill.

## When instabox itself gets in your way (feedback)

If instabox is at fault — a command breaks the contract its help or this skill states, the skill does not match what really happens, a capability is missing, or the CLI is confusing — report it, then carry on with the user's task using a workaround. Never block on the report, and never report problems in the code the user is building.

```sh
instabox feedback --json --type bug --component cli --area exec \
  --title "exec --timeout 600 stops the command at 60s" \
  --detail "instabox exec work --timeout 600 -- make test was killed after 60 seconds" \
  --command "instabox exec work --timeout 600 -- make test" \
  --expected "the skill says exec accepts up to 600 seconds" --doc "skills/instabox/SKILL.md" \
  --workaround "ran it over instabox ssh instead"
```

- `--type`: `bug` when something does not work as its help or the docs say (when instructions did not match reality, also give `--doc`, `--expected` and `--workaround`), `feature-request` when what you need is not supported, `friction` when it works but is confusing or awkward, `other` otherwise.
- `--component`: `cli`, `api`, `sandbox` (the box itself, its templates or tools), `dashboard`, `skills`, `docs` or `other`. `--severity blocker|major|minor` (default `minor`); `--sandbox NAME` names the box involved.
- Emails, keys, tokens, home paths and public IPv4 addresses are redacted before sending, but do not paste secrets into it. Signed in, the report opens a support ticket on the account, and the team's replies show in the dashboard at the link it prints (`ticket` in `--json`); signed out or waitlisted, it reaches the team without one.
- A failed or unconfirmed submission prints a warning and exits 0: do not retry. File one report per problem, not one per attempt.

## Habits

- Forgotten boxes pause themselves after 30 idle minutes. Delete a box with `instabox rm --yes NAME` once its work is done. `rm`, `snapshot rm`, `secrets rm`, `vault rm` and `keys rm` ask y/N first and, off a terminal with no answer, delete nothing and fail, so pass `--yes` (`-y`).
- When the user asks for a new box, create one, with a name `instabox ls` does not already show. Offer an existing box only when they want to continue earlier work in it.
- `instabox usage` shows storage use and limits. A quota error means delete or stop something; do not retry the same create in a loop.
- `no_capacity` (`create` and `run` exit 75 with `--fail-fast`; otherwise `create` exits 1, `run` 125) is different: no host has room right now and nothing was kept. It is retryable: retry the same command with backoff (about 15 s, 30 s, 60 s, then every few minutes), or try another size (`--vcpus/--mem-mib`) or template.
