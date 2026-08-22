# gitee-pr-workflow

Gitee → GitHub pull-request workflow skill.

Uses the `gitee` Rust CLI to:

- commit changes in logical chunks on a new branch
- push the branch to Gitee (`git push gitee BRANCH`)
- create, approve, and squash-merge a Gitee PR (`gitee pr create`, `gitee pr approve`, `gitee pr merge --squash --no-close-issue`)
- post an evidence comment and close the linked issue (`gitee issue comment`, `gitee issue close`)
- sync Gitee `main` to local and push local `main` to GitHub
- watch GHA **Build py_total** and replace `artifacts/py_total.exe`
- if that build fails, open a hotfix PR (never push new commits straight to `main`)

Always pass `--remote gitee` (this repo's Gitee remote is named `gitee`, not `origin`).

See `SKILL.md` for the full workflow and command reference.
