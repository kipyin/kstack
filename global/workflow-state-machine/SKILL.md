---
name: workflow-state-machine
description: >-
  Use when advancing an issue from idea to merged PR, judging what to do next
  on a ticket, dispatching implementation, or deciding whether a PR is ready
  for UAT.
---
# workflow-state-machine

从「想法」到「合并」的七个状态。**状态存在 GitHub label 上，依赖存在原生 sub-issue + `blocked_by` 里**，不另存任何图。

## 状态表

| 状态 | label | 谁推进 | 产出 | 退出条件 |
|---|---|---|---|---|
| 已立项 | `bug` 或 `enhancement` + `needs-triage` | owner 伙伴 | issue（含复现/期望） | 开出 grilling |
| Grilling | `grilling` | Kip + 伙伴 | 决策记录、效果图 | workload 评估完成 |
| Agent Brief | `ready-for-agent` | 伙伴 | issue comment: Brief | 进入实现 |
| Spec + 子票 | spec 票 `ready-for-agent` + `spec`；子票 `ready-for-agent` | 伙伴 | 原 issue 改写为 Spec、原生 sub-issues | 子票全 ready |
| 实现中 | `in-progress` | 执行者 | 1 个 PR | PR 打开 |
| 修复循环 | `in-review` | 执行者 | 修复提交 + 逐条回复 | 四项检查全清 |
| 待验收 | `uat` | owner 伙伴（不跑 CI） | 验收结论 | 判 PASS |
| 待合并 | `approved` | **Kip** | — | squash merge |
| 阻塞 | `blocked` | 谁发现谁写 | 原因 + 下一步 | Kip 决定 |

## 幂等纪律（轮询状态机必须遵守）

1. **先占位再干活**：派工前 `--add-label in-progress --remove-label ready-for-agent`。抢到才动手；看到 `in-progress` 就跳过。
2. **失败回滚**：派工失败立刻把 label 打回 `ready-for-agent` 并回帖写清原因。**绝不留挂着 `in-progress` 却没人干的票。**
3. **派工记录**：拿到执行会话 id 后回帖，正文带 `<!-- session: <id> -->`，下次心跳靠它查进度而不是重新派。
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
- **执行者**：实现、修 PR，提交身份见 `github-identity`
- **Kip**：业务决策、生产写入、合并

## 禁止

- 跳过状态直接改 label 到 `approved`
- 用 issue 留言当「已完成」的证据（见 `work-board` 的核实纪律）
- 一个心跳派多张票
- 让 `in-progress` 的票超过一天没人管而不处理
