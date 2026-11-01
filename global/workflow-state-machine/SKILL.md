---
name: workflow-state-machine
description: >-
  Use when advancing an issue from idea to merged PR, judging what to do next
  on a ticket, dispatching implementation, or deciding whether a PR is ready
  for UAT.
---
# workflow-state-machine

从「想法」到「合并」的七个状态。**人只写三个标签，其余状态从 GitHub 事实推导。**依赖存在原生 sub-issue + `blocked_by` 里，不另存任何图。

## 人写的标签（只有三个）

| label | 谁写 | 含义 |
|---|---|---|
| `needs-triage` | owner 伙伴 | 刚立项，等 triage |
| `ready-for-agent` | triage 通过方 | **唯一放行闸**：可以派工了 |
| `blocked` | 谁发现谁写 | 需要 Kip 决定，不能自己往下走 |

其余状态**不需要人打**。谁也不用记着「现在该打 uat 了」。

## 推导态（脚本算，标签不参与）

只要 issue 上有 PR，状态就从 PR 事实推出来：

| 推导态 | 依据 |
|---|---|
| 执行中 | PR 存在且仍是 draft |
| 修复循环 | PR 开着，CI 有失败 / 未跑完 / 有 change request |
| 待验收 | PR 开着，非 draft，CI 全绿，无 change request |
| 待合并 | PR 已被 approve |
| 已完成 | issue 关闭（不再出现在列表里） |

`in-progress` **保留但不当作状态**：它是派工前的**互斥锁**，防止两轮心跳重复派工。写完就不管，没人靠它读状态。

## 完整流转

```
立项（needs-triage）
  → triage + grill + workload 评估
  → ready-for-agent                ← 人打的唯一放行
  → 抢占 in-progress + 派工        ← 互斥锁，不是状态
  → PR 出现（draft）       · 执行中（推导）
  → PR 转 ready             · 修复循环 / 待验收（推导）
  → approve                · 待合并（推导）
  → Kip squash merge       · 已完成（推导）

任一环节出问题 → blocked（人写）
```

## Grilling（S2）到底怎么做

**这是整个流程里最容易被做错的一步。**

### 正确形式：对话式逐题

1. 一次只问**一题**，问题带上下文、选项的实际后果、以及你的推荐（带依据）
2. **等你回答完再问下一题**。下一题的措辞往往取决于上一题的答案
3. 每得到一条结论就写进 issue comment（决定 + 理由 + 日期），不要攒到最后
4. 问到「可以 fold 出 spec 和 tickets」就停，不要为了完整而多问

用 `grilling` skill 的追问手法（那是工程手法，与本流程兼容）。

### 错误形式（真实发生过）

- ❌ **派一个后台任务去「生成 grill 草稿」，列 N 个问题让 Kip 填空**
- ❌ 把 10 个问题一次抛出来
- ❌ 自己替 Kip 代选，然后说「其余按默认」

为什么不行：grill 的价值在于**答案会改变问题**。批量问卷里第 5 题可能因为第 2 题的答案就作废了，但问卷不知道。它看起来像 grill，实际是提前固化了一个没验证过的方向。

### 唯一例外

Kip **明确说**「给我一份问卷」「列成清单我自己填」时才产草稿。否则默认是对话式。

### 谁 grill

- **owner 伙伴**自己问（业务方向不确定时问 Kip）
- 不需要「另一个 bot 来主持 grill」——那是 Lody Sous Chef 时代的角色，已取消
- 需要并行查资料时用 `subagent(agent:"scout")`，但**问人的环节不能外包**

## 派工机制（四选一，按活的性质）

| 用在哪 | 用什么 | 说明 |
|---|---|---|
| **实现一张票 / 一份 spec** | `start_session_task` | 长跑、要独立 worktree、要产 PR。带 `working_dir` + `use_worktree=true` + `timeout_ms` |
| **写 PR body、查资料、画效果图** | `subagent` | 一次性，一次一句话。查资料用 `agent:"scout"`，写文用 worker |
| **需要特定模型的一次性任务**（如 opus 追问、gpt 决策地图） | `subagent(model=..., async=true)` | **只有 subagent 能指定模型**；`start_session_task` 用伙伴的 Task Model |
| **同屏盯多个 worker 并行** | ❌ 伙伴做不到 | 协同模式（Orca）只在普通任务里提供，伙伴聊天没有 |

**派工必带的两样**（不带就一定出事）：
1. **身份**：bot 短名 + `GIT_NAME` / `GIT_EMAIL`（取自 `~/gh-apps/bots/<bot>.conf`）。后台任务不知道自己是哪个 bot。
2. **哪张票**：issue 链接 + 验收标准 + scope。

**回报契约**：执行者回 PR 链接 + 跑过的测试命令 + 验收标准逐条结果 + 越界点。见 `build`。

## 幂等纪律（轮询状态机必须遵守）

1. **先占位再干活**：派工前 `--add-label in-progress --remove-label ready-for-agent`。抢到才动手；看到 `in-progress` 就跳过。
2. **失败回滚**：派工失败立刻把 `ready-for-agent` 打回去、去掉 `in-progress`，并回帖写清原因。**绝不留挂着 `in-progress` 却没人干的票。**
3. **派工记录**：拿到执行任务/会话 id 后回帖，正文带 `<!-- session: <id> -->`。下次心跳靠它查进度而不是重新派。
4. **一轮一张**：单次心跳最多派 1 张票、最多推 1 轮修复。

## workload 评估（Grilling 结束时做）

| 条件 | 结论 |
|---|---|
| 改动落在一个 PR 能自然完成的范围内：单模块、无跨仓、无 schema 迁移、验收标准一份 Brief 写得清 | **一个 session** → Agent Brief |
| 需要多个 PR / 跨模块拆分 / 有先后依赖 / 验收标准超过一份 Brief | **多个 session** → Spec + 子票 |

评估结果写进 issue comment，格式固定：

```
## Workload 评估
结论：一个 coding session | 多个 coding session
依据：<2–3 条，指向具体文件/模块/依赖>
```

## Agent Brief 必含

目标、现状、改动点（文件级）、验收标准（可逐条判定）、**不做什么**、提交身份（`GIT_NAME` / `GIT_EMAIL`）、关联 issue。

## Spec 与子票

- 原 issue 改写为 Spec：目标、范围、非目标、领域词汇、验收标准、子票 DAG
- 子票用 **GitHub 原生 sub-issue + blocking 关系**，不自己造 DAG 存储
- frontier 判定：一个子票可执行 ⇔ 所有 blocker 已 closed
- 每张子票必须有独立验收标准，否则无法派工
- 带 `spec` 的父 issue 在项目板上算**一条**待办，子票不上板（见 `work-board`）

## 修复循环（in-review）：四项检查

每次 PR 更新后检查：

1. **review comments** —— 逐条对照 `ponytail` 判真假；真的修，假的逐条回复说明为何不是真问题
2. **merge conflict** —— 自己 rebase 解决，不推给 Kip
3. **CI failure** —— 修到绿；同类环境失败连续两次则升级
4. **PR 规范** —— `/pr` 格式的 body、UI 类必须有前后对比图、`Closes #n`

**上限 3 轮**。超过仍在 in-review → 转 `blocked`，附「每轮修了什么、还差什么」。

## 验收（uat，不跑 CI）

- 逐条对照 PR body 里的验收标准与实际改动
- UI 类：真实页面截图与确认过的效果图并排比对，覆盖 loading / empty / error / 长内容 / hover
- 数据类：查库或 245 核实，不看 issue 留言
- 结论只有两档：**PASS**（可合并）/ **需要修**（退回 in-review，附具体条目）

合并永远由 Kip 做，任何伙伴都不 squash merge。

## 角色

- **owner 伙伴**：立项、grilling、workload 评估、Brief/Spec、UAT
- **orchestrator**（Gabe）：心跳推进、状态迁移、派工、催办
- **执行者**：实现、修 PR（按 `build` 执行，提交身份见 `github-identity`）
- **Kip**：业务决策、生产写入、合并

## 禁止

- 给派工后的票补 `in-review` / `uat` / `approved` 标签——这些状态是推导的，手打会与事实冲突
- 跳过 `ready-for-agent` 直接派工
- 用 issue 留言当「已完成」的证据（见 `work-board` 的核实纪律）
- 一个心跳派多张票
- 让 `in-progress` 的票超过一天没人管而不处理
