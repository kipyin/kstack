---
name: github-identity
description: >-
  Use before any GitHub write (issue, comment, label, PR, review, merge,
  release) on lightxlab repos, and whenever a prompt would make someone else
  commit code.
---
# github-identity

每个 bot 用自己的 GitHub App 身份写，**绝不用 Kip 的身份**。页面上显示的作者必须是 `<name>-grok[bot]`。

## 机械

`gh-as <name> <gh 参数>` 等价于 `gh`，但 token 换成了该 App 的 installation token：

```
gh-as clara issue comment 12 -R lightxlab/lightmind --body "..."
gh-as gabe  issue edit 42 -R lightxlab/lightmind --add-label ready-for-agent
```

实现：`~/gh-apps/bin/gh-as` → `gh-app-token <name>` 从 Bitwarden 条目 `github-app/<name>` 取 PEM（notes），签 JWT 换 installation token，缓存在 `~/.cache/gh-apps/<name>/`。私钥只在内存里，**永不打印、永不复制**。

`gh-as` 只在 **lightxlab** 组织有效。`kipyin` 的 repo（含 chronicles）不适用，那边照旧用 `gh`。

## 各 App 权限（2026-11-01 核实）

| App | 权限 | 能做什么 |
|---|---|---|
| `clara` / `vera` / `iris` / `felix` | contents:write, issues:write, pull_requests:write, checks:read, statuses:read, organization_projects:write | 全功能：开 issue、开/合并 PR、看 CI |
| `theo` / `nora` | contents:write, issues:write, pull_requests:write, organization_projects:write | **看不到 CI 结论**（无 checks/statuses） |
| `gabe` | issues:write, pull_requests:write, organization_projects:write | **读不到代码**（无 contents）；不开 issue |

被拒绝就说明这个动作不在你的 App 权限内——**不要退回 Kip 的身份**，告诉 owner。

## 规则

1. **写走 `gh-as`，读可以用普通 `gh`**（读不受限）。
2. **绝不用 GitHub 插件/连接器写**：那些一律以 Kip 身份发。读可以。
3. **提交代码时的身份**：需要别人（Lody Builder、subagent）提交时，把 `GIT_NAME` / `GIT_EMAIL` 的**具体值**写进任务说明，取自 `~/gh-apps/bots/<name>.conf`。拿不到就让对方至少加 `Co-authored-by: <GIT_NAME> <GIT_EMAIL>`。推完核对 GitHub 上的 commit author。
4. **PR 自己开**：分支推上去后，用 `gh-as <name> pr create` 开，别等人代开。
5. **别用 Kip 的 token 绕过**：不存在 `GH_GUARD_ALLOW_KIP` 这种例外——本机没装 guard，全靠这条规则约束。
6. **`wayfinding:*` 标签只有 Wayfinder 能加**，任何 bot 都不加、不改、不通过别人加。
7. **密钥**：App 私钥在 Bitwarden，只经 `gh-app-token` 读取。见 `secrets` skill。

## 坏了怎么办

- `gh-as` 报「could not mint token」→ Bitwarden 会话过期。按 `secrets` skill 重新 `bw unlock`，把 token 写回 `~/.config/bw-session.env`（要带 `export`）。
- 报 403 `Resource not accessible by integration` 但动作本该允许 → 看 §权限表，多半是这个 App 没有该 scope。
- App 没装在某个 repo 上 → 告诉 Felix M.（lightxlab GitHub estate 归他）。
