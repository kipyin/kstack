---
name: gitee-pr-submit
description: >
  Commit local changes in logical chunks, push a feature branch to Gitee, and
  open a PR whose body is plain language: what we did, what we verified, with
  human-in-the-loop (HITL) verification called out explicitly. Links the
  related issue with `#IKxxxx` in the body (the # is mandatory; without it
  Gitee neither links nor autocloses the issue). Submit only: do not approve,
  merge, or sync here. Trigger: "submit pr",
  "提交 PR", "create gitee pr", "开个 PR", "commit and pr", "提交评审".
---

# Gitee PR Submit (commit + open PR for review)

Use this skill to turn a set of local changes into a Gitee PR opened for
review. It stops at PR creation. Approve, merge, sync, GitHub mirror, and CI
watch are a separate landing skill; do not do them here.

## Prerequisites

- `gitee` Rust CLI on `PATH`, authenticated once. **Always pass `--remote gitee`**
  (this repo has no `origin`).
- Git remote `gitee` configured (this repo names it `gitee`, not `origin`).
- The related Gitee issue ident (e.g. `IK5EYY`), from the user or from the
  branch/commit context. Ask if it is not obvious; do not invent one.
- You are on `main` with the changes unstaged/uncommitted, or on a feature
  branch already. Know which before committing.

## 1. Inspect, group, branch, commit, push

Run in order:

```bash
git status --short && git diff --stat          # group by concern
git checkout -b "feature/<short-desc>-$(date +%Y%m%d)"
git add <chunk-files> && git commit -m "<type>(<scope>): <summary>" -m "<body>"
# repeat per chunk
git log --oneline main..HEAD                    # verify history
git push gitee feature/<short-desc>-...
```

One concern per commit; tests with the code they cover; dependent files
together; standalone docs/scripts last.

Completion: branch pushed, `git log --oneline main..HEAD` shows the logical
chunks you intend the PR to ship.

## 2. Write the PR body (the point of this skill)

Plain language, written for someone who will not read the diff. Four sections,
in this order:

```markdown
## 做了什么

<2-4 句大白话：原来什么问题/现在变成什么。用户视角，不贴代码。>

## 改动

- `path/file.py:line` - <一句话，根上改了什么>
- ...

## 验证

**自动**
- `<command>` - <通过数/结果，例如 17 鉴权 + 177 analysis 用例全绿>
- ...

**人工 (HITL)**
- <跟谁确认了什么 / 手动跑了什么 / 观察到什么> - <结论>
- ...

## 关联

Linked: #IKxxxx
```

Rules that make the body do its job:

- **做了什么** is prose, not a file list. If a non-coder on the team cannot
  say what changed after reading it, rewrite it.
- **改动** is the file:line list, one line each, root change not symptom.
- **验证 / 自动** lists the commands you actually ran with their real results.
  Do not list a test you did not run.
- **验证 / 人工 (HITL)** is the emphasis. Write what human-in-the-loop
  verification happened: a manual run, a confirmation with the maintainer, a
  platform login tried by hand, a number eyeballed against the real system.
  Each line: who/what + observed result. If no HITL verification was done, say
  so explicitly (`本期仅自动验证，未做 HITL`) rather than leaving the section
  empty or padded. An empty HITL section is a signal the PR may not be ready.
- **关联** line is mandatory when there is a related issue, and the `#` is
  non-negotiable (see §3).

## 3. Link the issue with `#` (mandatory)

Gitee only recognizes an issue reference in the body when it is prefixed with
`#`. `IK5EYY` in prose is plain text; `#IK5EYY` is a link and an autoclose
trigger on merge. This has bitten us: PR 223 wrote `IK5CUG` with no `#` and
Gitee linked nothing; PR 216 wrote `Linked: #IK419H` and it linked.

So the body always ends with:

```markdown
Linked: #IKxxxx
```

Also pass the API-level close link so merge autocloses the issue (bare ident,
no `#`, per `gitee pr create --close-issue`):

```bash
gitee --remote gitee pr create \
  --title "<PR title>" \
  --head "$BRANCH" --base main \
  --close-issue IKxxxx \
  --body "$(cat pr_body.md)"
```

If the PR should NOT autoclose the issue (e.g. partial fix, or when an
evidence comment must be posted before closing), drop `--close-issue` and keep
only the `Linked: #IKxxxx` line, and say so to the user. Default is autoclose.

Capture the PR number:

```bash
export PR_NUMBER=$(gitee --remote gitee --json pr create \
  --title "<PR title>" --head "$BRANCH" --base main \
  --close-issue IKxxxx --body "$(cat pr_body.md)" | jq -r '.number')
```

## 4. Report

Print the PR URL (`gitee --remote gitee pr view "$PR_NUMBER" --json | jq -r .html_url`)
and a one-line summary of what the body says was done + verified. Stop. Do not
approve, merge, close, sync, or push `main`. Landing is a separate skill.

## Pitfalls

- **Forgetting the `#` on the issue ident in the body.** `IK5EYY` links
  nothing; `#IK5EYY` links and autocloses. Always write `Linked: #IKxxxx`.
- **Listing tests you did not run.** The 自动 section is real commands with
  real results. If you did not run it, do not write it.
- **Empty or padded HITL section.** Say `未做 HITL` plainly if true; do not
  fake human verification. An honest "not yet verified by a human" is more
  useful than a fabricated line.
- **Inlining the markdown body in a double-quoted shell string.** Backticks
  and `$` break it. Always `--body "$(cat pr_body.md)"`.
- **`--close-issue` takes the bare ident** (`IK5EYY`), not `#IK5EYY`. The `#`
  belongs only in the body.
- **Submitting when HITL is expected but missing.** If the change touches
  user-facing behavior and no human verified it, flag that to the user before
  creating the PR rather than hiding it in the body.
- **No em dash** in the body (`AGENTS.md` rule).