---
name: gitee-pr-workflow
description: >
  End-to-end workflow for landing a change on both Gitee and GitHub using the
  `gitee` Rust CLI. Delegates commit + PR creation to `gitee-pr-submit`
  (plain-language body, HITL verification, `Linked: #IKxxxx`), then approves it,
  squash-merges with `--no-close-issue`, adds an evidence comment and closes
  the linked issue, syncs Gitee main back to local, pushes local main to GitHub,
  then watches GitHub Actions Build py_total and replaces artifacts/py_total.exe.
  Post-land CI failures use a hotfix PR; never push new commits directly to main.
  Trigger: "gitee pr workflow", "commit and pr to gitee", "land changes on gitee and github",
  "create gitee pr", "approve and merge gitee pr", "watch py_total", "download py_total artifact".
---

# Gitee → GitHub PR Workflow

Use this skill when you need to publish a set of local changes through a Gitee PR and keep GitHub `main` in sync.

## Prerequisites

- Git remotes configured as:
  - `gitee` → `https://gitee.com/<owner>/<repo>.git`
  - `github` → `git@github.com:<owner>/<repo>.git` (or HTTPS)
- `gitee` Rust CLI installed and on `PATH` (`gitee --version`).
- Authenticated once per machine:

```bash
gitee auth login --token <PERSONAL_ACCESS_TOKEN>
```

- Token is stored per host by `gitee auth login` under the OS config directory.
- On macOS: `~/Library/Application Support/gitee/gitee.com.token`.
- **Always pass `--remote gitee`.** This repo names the Gitee remote `gitee`, not `origin`. The CLI resolves the repo from that remote; without it you get `no 'origin' remote found`.
- You are on `main` (or the target branch) with the changes you want to land still unstaged/uncommitted.

Global flag placement (both work):

```bash
gitee --remote gitee pr list
gitee pr list --remote gitee
```

## 1. Submit the PR via `gitee-pr-submit`

Run `gitee-pr-submit` to inspect, group, branch, commit, push, and open the
PR. It writes the plain-language body (what we did + verifications + HITL) and
links the related issue with `Linked: #IKxxxx`.

Use the **no-autoclose** variant: `gitee-pr-submit` drops `--close-issue` and
keeps only the `Linked: #IKxxxx` line. This skill must post an evidence
comment before closing the issue (§4), so the issue must not autoclose on merge.

Capture from `gitee-pr-submit`'s output:

```bash
export PR_NUMBER=<from gitee-pr-submit>
export ISSUE_NUMBER=IKxxxx     # the ident gitee-pr-submit linked
```

## 2. Approve the PR

```bash
gitee --remote gitee pr approve "$PR_NUMBER"
```

## 3. Squash-merge the PR

Use `--no-close-issue` so you can post an evidence comment before closing the issue yourself.

```bash
gitee --remote gitee pr merge --squash --no-close-issue "$PR_NUMBER"
```

## 4. Comment on and close the resolved issue

If the PR resolves a Gitee issue, add a closing comment with evidence and the PR link, then close the issue.

```bash
# close_comment.md: Chinese evidence comment (template below)
gitee --remote gitee issue comment "$ISSUE_NUMBER" -m "$(cat close_comment.md)"
gitee --remote gitee issue close "$ISSUE_NUMBER"
```

### Closing-comment template

```text
经代码库审计，该问题已在当前实现中解决：

- `path/to/file.py:80-92` 实现了 ...
- `tests/.../test_zzz.py:100-120` 覆盖了该场景
- 同步更新 `docs/...md` §X，移除过时标记
- 对应 PR: https://gitee.com/<owner>/<repo>/pulls/<N>

关闭本 issue。
```

## 5. Sync Gitee main to local

```bash
git checkout main
git pull gitee main
```

## 6. Push local main to GitHub

```bash
git push github main
```

## 7. Watch GHA Build py_total and refresh local artifact

Pushing `main` to GitHub triggers workflow **Build py_total**
(`.github/workflows/build-py-total.yml`).
After step 6, wait for that run, download the artifact, and replace
`artifacts/py_total.exe` (gitignored; never commit it).

```bash
# Find the in-progress / latest Build py_total run for this SHA
HEAD_SHA=$(git rev-parse HEAD)
RUN_ID=$(gh run list --workflow "Build py_total" --branch main --limit 5 \
  --json databaseId,headSha,status,conclusion,url \
  --jq "map(select(.headSha == \"$HEAD_SHA\"))[0].databaseId")
test -n "$RUN_ID"

gh run watch "$RUN_ID" --exit-status

# Artifact name is fixed in the workflow upload step
ARTIFACT_NAME=py_total-windows-py312
rm -rf /tmp/py_total_dl
mkdir -p /tmp/py_total_dl artifacts
gh run download "$RUN_ID" -n "$ARTIFACT_NAME" -D /tmp/py_total_dl
EXE=$(find /tmp/py_total_dl -name 'py_total.exe' -type f | head -1)
test -n "$EXE"
cp -f "$EXE" artifacts/py_total.exe
ls -la artifacts/py_total.exe
```

Notes:

- Use `gh run watch --exit-status` so a failed build stops the workflow.
- Do not guess the artifact name; confirm with
  `gh api repos/<owner>/<repo>/actions/runs/$RUN_ID/artifacts --jq '.artifacts[].name'`
  if the workflow renames it.
- If no run matches `HEAD_SHA` yet, wait briefly and re-query `gh run list`.
- Skip this step only when the user says the binary is not needed for this land.

### 7a. If Build py_total fails: hotfix PR, never push `main` directly

Gitee `main` is protected.
Step 6 only syncs the already-merged squash commit.
Do **not** commit new fixes onto local `main` and `git push gitee/github main`.

When the land build fails (or any other post-land fix is needed):

1. Branch from the current `main` tip: `git checkout -b fix/<short-desc>-$(date +%Y%m%d)`.
2. Commit the minimal fix on that branch.
3. Push the branch to Gitee and open a new Gitee PR (steps 1–3): submit via `gitee-pr-submit`, approve, squash-merge with `--no-close-issue`.
4. Sync and mirror again (steps 5–6), then re-run step 7 for the new `main` SHA.
5. Comment on the original landed PR with the hotfix PR URL and the failing run URL.

Tell the user the land is blocked on the hotfix PR if they need to review before you approve/merge it.

## Pitfalls

1. **The PR body comes from `gitee-pr-submit` in no-autoclose mode** (`Linked: #IKxxxx`, no `--close-issue`, no Closes keyword). Do not add `Closes`/`Fixes`/`Resolves`: Gitee would autoclose the issue on merge before you can post the evidence comment in §4.
2. **PR body shell-escaping is `gitee-pr-submit`'s job** (`--body "$(cat pr_body.md)"`). If you ever build a body here, use the same form, never inline double-quoted markdown.
3. **Squash merge collapses the PR into one commit on `main`.** Do not reuse the local feature branch after merge.
4. **If the PR cannot merge cleanly,** abort and rebase the feature branch on the latest `main` before retrying.
5. **After GitHub push,** step 7 (Build py_total watch + `artifacts/py_total.exe` replace) is part of the default land unless the user opts out.
6. **Never push new commits directly to `main`.** Owner tokens can bypass Gitee branch protection; that is not permission to skip a PR. Hotfixes after a land use §7a.

## One-shot command chain

After `PR_NUMBER`, `ISSUE_NUMBER`, and `close_comment.md` are ready:

```bash
gitee --remote gitee pr approve "$PR_NUMBER" && \
gitee --remote gitee pr merge --squash --no-close-issue "$PR_NUMBER" && \
gitee --remote gitee issue comment "$ISSUE_NUMBER" -m "$(cat close_comment.md)" && \
gitee --remote gitee issue close "$ISSUE_NUMBER" && \
git checkout main && \
git pull gitee main && \
git push github main && \
HEAD_SHA=$(git rev-parse HEAD) && \
RUN_ID=$(gh run list --workflow "Build py_total" --branch main --limit 5 \
  --json databaseId,headSha --jq "map(select(.headSha == \"$HEAD_SHA\"))[0].databaseId") && \
gh run watch "$RUN_ID" --exit-status && \
rm -rf /tmp/py_total_dl && mkdir -p /tmp/py_total_dl artifacts && \
gh run download "$RUN_ID" -n py_total-windows-py312 -D /tmp/py_total_dl && \
cp -f "$(find /tmp/py_total_dl -name py_total.exe -type f | head -1)" artifacts/py_total.exe
```

## Notes

- For GitHub-only flows, use `gh pr create` / `gh pr merge` instead.
- Use `gitee --remote gitee --json pr list` or `gitee --remote gitee --json issue list` when you need machine-readable output.
