---
name: gitee-pr-review
description: >
  Adversarial two-axis review of a Gitee PR, then post ONE PR-level review
  comment. Sets up an isolated worktree off main, delegates the
  Standards+Spec review to the code-review skill, explains findings two ways
  (CEO = plain user-facing value; intern = file:line mechanics assuming no
  codebase familiarity), drafts the comment in the PR's language, shows it
  for approval, then posts via the gitee CLI after a --preview dry run.
  Never attempts inline/diff line comments (broken in this toolchain, see
  Pitfalls). Review-only: never approve or merge. Trigger: "review gitee pr",
  "评审 PR", "adversarial review pr", "pr review", "review PR <number>",
  "review this branch".
---

# Gitee PR Review (adversarial, two-axis, single comment)

Use this skill to review a Gitee PR hard and leave one well-structured review
comment. It is the review counterpart to `gitee-pr-workflow` (which lands
changes). Review-only: do not approve, merge, or push here.

## Prerequisites

- `gitee` Rust CLI on `PATH`, authenticated once (`gitee auth login --token ...`).
  Token lives under `~/Library/Application Support/gitee/` on macOS.
- **Always pass `--remote gitee`** (this repo has no `origin`).
- The `code-review` skill available (this skill delegates the two-axis review to it).
- The PR number or branch from the user.

## Pipeline (run in order)

### 1. Pin the PR and the fixed point

Resolve the PR, its head branch, its base, and the linked issue:

```bash
gitee --remote gitee pr view <N>        # head branch, base, body, linked issue id
git fetch gitee
```

The fixed point is the merge-base of `gitee/main` and the PR head (three-dot):

```bash
BASE=$(git merge-base gitee/main gitee/<pr-head-branch>)
git rev-parse "$BASE"          # FAIL FAST if it doesn't resolve
git diff "$BASE"...HEAD --stat # FAIL FAST / report if empty
git log "$BASE"..HEAD --oneline
```

### 2. Isolated worktree off main

Never review on a dirty checkout. Make a throwaway worktree and check out the
PR branch there:

```bash
git worktree add /Users/kip/Code/lighthouse-wt-pr<N> gitee/main
cd /Users/kip/Code/lighthouse-wt-pr<N>
git checkout gitee/<pr-head-branch>
git rev-parse HEAD            # confirm on the PR tip
```

Convention: `/Users/kip/Code/lighthouse/.worktrees/pr-<N>-review`. All diff/read commands in
the next steps run from this worktree.

### 3. Source the spec

The Spec axis needs the originating spec. Find it, in this order:

1. Issue id referenced in the PR body -> `gitee --remote gitee issue view <ID>` (primary).
2. A PRD/spec file the user pointed at, or under `docs/`, `specs/`, `.scratch/`.
3. If nothing, ask the user. If they say there is none, the Spec sub-agent skips.

### 4. Adversarial two-axis review: delegate to the `code-review` skill

Do not re-derive the smell baseline or the two-axis framing here; follow the
`code-review` skill exactly. In one message, spawn two `general-purpose`
sub-agents in parallel:

- **Standards sub-agent:** send the diff command, the commit list, the
  standards sources (`AGENTS.md` / `.cursor/rules/ponytail.mdc` = "Ponytail"),
  and the smell baseline (pasted in full, the sub-agent has no other access),
  plus the project-specific concerns: trust-boundary input validation on the
  HTTP layer, data-loss error handling, SQLite/SQL correctness, and
  unrequested abstraction/speculative generality.
- **Spec sub-agent:** send the diff command, the commit list, and the spec
  (issue body) verbatim.

**Trust but verify:** sub-agent summaries describe intent, not necessarily
truth. Before reporting, grep/read the actual files to confirm the strongest
findings (e.g. a claimed rename-missed-a-caller regression). It is fine to
run a Standards or Spec sub-agent twice if the first one fails with a session
error.

### 5. Explain findings two ways

After verifying, present findings in two registers. Both are part of the
deliverable, not optional:

- **To the CEO (plain language, user perspective):** what the PR does for the
  end user in one short paragraph, no jargon, no file paths. Then a one-line
  bottom line. This is for a non-engineering reader.
- **To the intern (detailed mechanics):** per finding, four parts, grounded in
  `file:line` with short code quotes:
  1. 背景: what the relevant module/function does, assuming zero codebase familiarity.
  2. 代码在哪: exact `file:line` and the offending snippet.
  3. 为什么是 bug: the mechanic.
  4. 真实后果: when it bites the user.
  Rank by real-user impact, not by smell category. Define terms (TUI, SSE,
  session store, model catalog) the first time they appear.

### 6. Draft the PR comment

Write the review comment that will actually be posted:

- **Language matches the PR** (Chinese PR -> Chinese comment).
- **No em dash** anywhere (`AGENTS.md` writing rule); use plain dash, comma, colon, or rewrite.
- Structure by impact: `## 阻塞` (blocker) -> `## 需要修` (should fix) ->
  `## 建议` (suggestion) -> `## 范围之外` (out of scope, note only).
- Each finding is self-contained: code在哪 / 为什么是 bug / 真实后果, with `file:line`.
- Acknowledge what the PR does right in one line at the top.

### 7. Show before posting

Write the body to a temp file (inline shell strings break on markdown
backticks/quotes):

```bash
write /tmp/pr<N>_review.md   # the full markdown body
```

Show the user the exact bytes. Edit on feedback. **Never edit-and-post in one
turn** before they've seen it.

### 8. Post after approval

`--preview` first (no HTTP call), then the real post:

```bash
gitee --remote gitee pr comment create <N> --body "$(cat /tmp/pr<N>_review.md)" --preview
gitee --remote gitee pr comment create <N> --body "$(cat /tmp/pr<N>_review.md)"
```

Confirm the posted URL. Leave the worktree in place until the user is done, in
case they want a follow-up fix there.

## Pitfalls (hard-won, all from real incidents)

1. **NEVER attempt inline / diff line comments.** Two independent breakages:
   - **CLI decode bug:** `pr comment create`/`list` with `--position` fails
     with `error decoding response body`. Root cause: the CLI declares
     `position` as a `String` but the API returns it as an `int`, so the
     response parse fails.
   - **v5 `position` stores null:** even posting raw `curl` to the v5 API,
     `position` is accepted but the comment anchors to nothing (`position` /
     `original_position` come back `null`); it becomes a normal PR comment
     that merely carries a `path`. The `line_code` mechanism is
     **enterprise-API only** and the value is an opaque string computed by
     the Gitee web frontend, not computable from the public API.
   - **Resolution:** use ONE PR-level comment with `file:line` references
     (Gitee renders them clickable). Do not chase inline anchoring.

2. **A decode error may still mean the POST succeeded.** The CLI fails parsing
   the response, not necessarily the request. Before retrying, read back; a
   blind retry double-posts.

3. **`comment list` is broken by the same decode bug.** Read and delete via
   `curl` against the v5 API:

   ```bash
   TOK=$(find "$HOME/Library/Application Support/gitee" -name '*.token' -exec cat {} \;)
   # list
   curl -s "https://gitee.com/api/v5/repos/hrcblazers/lighthouse/pulls/<N>/comments?access_token=$TOK&per_page=50"
   # delete a stray/duplicate comment (returns 204)
   curl -s -o /dev/null -w "%{http_code}\n" -X DELETE \
     "https://gitee.com/api/v5/repos/hrcblazers/lighthouse/pulls/comments/<id>?access_token=$TOK"
   ```

4. **Always `--body "$(cat file)"`.** Markdown backticks/quotes/`$` break
   inline double-quoted shell strings. Same reason as `gitee-pr-workflow`.

5. **Leave the PR clean.** Delete any failed/duplicate/non-anchored comment
   you created before finishing (via the curl DELETE above). The PR should end
   with exactly the comments you intended.

6. **No em dash** in any posted writing (`AGENTS.md` rule).

## Notes

- The review method itself is repo-agnostic; this skill wraps it with this
  repo's Gitee posting flow and the worktree-isolation convention.
- Pairs with `gitee-pr-workflow` (landing). This skill never lands, approves,
  or merges.
- If the user asks to also fix a finding you found, do it in the worktree from
  step 2, then hand off to `gitee-pr-workflow` to land.
