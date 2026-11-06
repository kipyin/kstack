---
name: github-identity
description: >-
  Use before any GitHub write (issue, comment, label, PR, review, merge,
  release) on lightxlab repos, and whenever a prompt would make someone else
  commit code.
---
# github-identity

GitHub 写操作默认使用用户当前授权的 `kipyin` 身份。执行前确认当前 GitHub 身份；若不是 `kipyin`，停止并说明，不自行切换账号。提交代码前确认 Git 提交身份对应 `kipyin`；委派提交时明确要求使用该身份。身份不匹配或无法确认时停止并说明，不改账号配置。

旧名 `bot-github-identity` 指的就是本技能。不要另写一套身份规则。Alma 个人技能若提到 GitHub 写入，以这里的身份规则和 `wayfinding:*` 禁令为准。

## 规则

1. GitHub 写操作使用当前授权的 `kipyin` 身份；PR 创建同样适用。
2. `wayfinding:*` 标签只有 Wayfinder 能加、移除或修改，也不通过别人操作。
3. 密钥和 token 不打印、不复制；涉及 GitHub App 私钥时遵循 `secrets` skill。
