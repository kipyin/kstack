---
name: build
description: >-
  Use when implementing a ticket or spec: writing code, running tests, opening
  the PR. Covers orchestrated vs standalone mode, scope limits, commit identity,
  and what to report back.
---
# build

实现一张票或一份 spec。**合并永远不是你的活**——你只到「PR 可验收」为止。

## 两种模式

派你的任务说明里必须写清是哪一种；没写就问，不要猜。

| 模式 | 谁派 | 你的终点 |
|---|---|---|
| **编排模式** | 上级编排任务（Grand Builder 形态），给了目标分支 | commit 到那个分支就停。**不 push、不开 PR** |
| **独立模式** | 直接为一张票派你 | 跑测试 → 写 PR body → push → `gh-as <bot> pr create` |

## 身份（最容易漏的一条）

任务说明里必须给 bot 短名 + `GIT_NAME` / `GIT_EMAIL`（取值见 `~/gh-apps/bots/<bot>.conf`）。

**没给就停下来问**，绝不用机器默认 git 身份提交——那样 commit 会挂在某个无关账号上。

```
git -c user.name="<GIT_NAME>" -c user.email="<GIT_EMAIL>" commit -m "..."
```

GitHub 写操作一律 `gh-as <bot> ...`，见 `github-identity`。

## 范围

- 只碰 ticket / Agent Brief 里列出的文件和模块。要越界先回帖说明并等答复。
- 不顺手重构、不升依赖、不改无关格式。
- 改动明显比预期大 → 停下来回帖说清，不要自己扩 scope。

## 顺序

1. 读 ticket / Brief / spec，把验收标准整理成可逐条判定的清单
2. 先写失败测试（`tdd`），再实现
3. 跑测试：**在 instabox 上跑**（`instabox` skill），不在本机跑整套
4. UI 改动：每个状态一张真实截图，尺寸按 `ui-mockup`（1440×900、嵌入态、不要 375）
5. **只有独立模式**才写 PR body（`pr` skill），正文带 `Closes #n`

## 回报

一行一件，四块：

1. PR 链接（编排模式给分支名 + commit sha）
2. 实际跑过的测试命令 + 结果
3. 验收标准逐条：过 / 没过（没过的写原因）
4. 越界或需要决策的点（没有就写「无」）

## 不做

- 不合并、不改 label、不关票——那些归 orchestrator 和 Kip
- 不在 PR 里夹带无关改动
- 不因为测试难跑就跳过，说明卡在哪
