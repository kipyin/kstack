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
| `needs-triage` | owner bot | 刚立项，等 triage |
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

`in-progress` **保留但不当作状态**：它是派工前的**互斥锁**，防止 Gabe 两轮轮询重复派工。写完就不管，没人靠它读状态。

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

**开一场 grilling = 开一个 Lody session（`--agent-role Sous Chef`，配额不够用 Backup Chef），Kip 进那个 session 逐题回答。** CLI 细节见 `use-lody`。

### 机制

1. **Gabe triage 后开 Lody grilling session**（或 owner 按 handoff 接到已开好的链接）：
   ```
   blody session create --workspace kipyin \
     --agent-role Sous Chef \
     --title '<repo>#<n> grill' \
     --prompt-file grill.md --json
   ```
   角色本身就是 Griller：一轮只问一题，问完**结束本轮**（不要自问自答、不要自己猜答案）。不要手选 model / machine / agent-config——role 定死。
2. **Kip 在那个 Lody session 里回答**（https://lody.ai/kipyin/sessions/<id>）。下一题等他答完再问。
3. 每条拍定的结论**立即写回 issue comment**（决定 + 理由 + 日期），不要攒着。
4. 到「可以 fold 出 spec 和 tickets」就收，并把结论汇总回 issue；session 用完后 `blody session cancel`（或按 `use-lody` 归档纪律处理），不要留空转。

为什么必须是 Lody session：**Kip 要能进去对话**。Grok Bot 侧的子代理 / executor 他进不去，所以 grilling 只能用 Lody session。

### 任务的 instruction 必含

`grill.md` 只放票面事实（见 `use-lody` allowlist），并写清：

```
你是这场 grilling 的 Griller。目标：<票 + 要定的事>
- 一轮只问一题，问完就结束本轮，等 Kip 回答
- 每题给：问题 + 选项（选项要能直接选）；不要单独堆「白话 / 后果 / 推荐」模板
- Kip 答完再问下一题；上一题的答案可能让后面的问题作废，据此调整
- 每得到一条结论，立即以正确 bot 身份 issue comment 写回 <票号>
- 不代选、不批量列问题、不自己编答案
- 不要改 label、不开 PR、不 push
```

### 错误形式（真实发生过）

- ❌ 派一个 session 去「生成 grill 草稿」，列 10 个问题让 Kip 填空（**那是问卷，不是 grill**）
- ❌ 一次抛 10 题
- ❌ 自己替 Kip 代选，然后说「其余按默认」
- ❌ 在 session 里自问自答，Kip 根本没参与

区别：grill 里**答案会改变问题**——第 2 题的答案可能让第 5 题作废。问卷发现不了这件事，它只是把 10 个问题摆在那。

### 唯一例外

Kip 明确说「给我一份问卷」「列成清单我自己填」时才产草稿。

### Griller 的模型

**由 `--agent-role` 决定，禁止手选 model。** Sous Chef 不够用（session limit / 配额）就换 **Backup Chef** 继续，步骤见 `use-lody`「When Claude usage runs out」。不要 Kimi，不要裸 session。

### 不传话

**任何环节都不做人类与执行者之间的中继。**

- Kip 直接进 grilling session 回答；bot 不做「把问题转给 Kip、再把答案带回去」
- Kip 也可以直接进实现 session 看进度、提要求、插话——不需要 bot 转达
- bot 在这一层的职责只有三件：**开局**（`blody session create`、给足票面事实）、**收口**（把结论写回 issue）、**验收**（S6）
- 需要同步状态时，写进 issue / skill，不要用消息转述

反例：把 Grill 的 10 个问题抄进 Grok Bot 聊天发给 Kip、再把他的答案 `blody session chat` 回 session。既慢，又会在复制中丢上下文。

### 谁当 Griller

- **Lody `Sous Chef`（不够用 → `Backup Chef`）** 主持提问；Kip 进同一 session 回答
- 要并行查资料：另开 Lody `Explorer`（或短会话），但**问人的那一环必须在 Kip 能打开的 grilling session 里**

## 派工机制（按活的性质选 Lody role）

| 用在哪 | 用什么 | 说明 |
|---|---|---|
| **实现一张票** | `blody session create --agent-role Builder` | 单票 TDD、修 PR / 验收反馈（child）。`--repo` + `--branch`；worktree 由 Lody/role 管 |
| **一份 spec → 一个 PR** | `blody session create --agent-role Grand Builder` | 编排整份 spec（**唯一**实施路径）；子票用原生 sub-issue + 可打 `ready-for-agent`，但**绝不**单独派 Builder |
| **写 PR body、文档、规则** | `Writer` | 跟 `/pr`；一次性文案 |
| **查资料** | `Explorer` | 只读摸底，不开实现 PR |
| **画效果图** | `Painter`（若 live 可用）或 owner 侧 `ui-mockup` | Painter 若报 `agent_config_missing` 就别硬派 |
| **同屏盯多个 worker 并行** | ❌ 没有 Cindy/Orca 那套 | 并行 = 多个 Lody session / 多个 child；一次只让一个 conversation 写同一 worktree（见 `use-lody`） |

**派工必带的两样**（不带就一定出事）：
1. **身份**：bot 短名 + 字面 `GIT_NAME` / `GIT_EMAIL`（从 `/workspace/gh-apps/bots/<bot>.conf` 抄进 prompt）。Lody session 不知道自己是哪个 bot——见 `use-lody` + `bot-github-identity`。
2. **哪张票**：issue 链接 + 验收标准 + scope。

**回报契约**：执行者回 PR 链接 + 跑过的测试命令 + 验收标准逐条结果 + 越界点。见 `build`。

跟进 / 催一轮用：

```
blody session chat <id> --workspace kipyin --prompt-file followup.md
blody session status <id> --workspace kipyin
```

## 幂等纪律（轮询状态机必须遵守）

1. **先占位再干活**：派工前 `--add-label in-progress --remove-label ready-for-agent`。抢到才动手；看到 `in-progress` 就跳过。
2. **失败回滚**：派工失败立刻把 `ready-for-agent` 打回去、去掉 `in-progress`，并回帖写清原因。**绝不留挂着 `in-progress` 却没人干的票。**
3. **派工记录**：拿到 Lody session id 后回帖，正文带 `<!-- session: <id> -->`。下次轮询靠它查进度而不是重新派。
4. **一轮一张**：Gabe 单次轮询最多派 1 张票、最多推 1 轮修复。

## workload 评估（Grilling 结束时做）

| 条件 | 结论 |
|---|---|
| 改动落在一个 PR 能自然完成的范围内：单模块、无跨仓、无 schema 迁移、验收标准一份 Brief 写得清 | **一个 Lody session** → Agent Brief → `Builder` |
| 需要多个 PR / 跨模块拆分 / 有先后依赖 / 验收标准超过一份 Brief | **多个 session / 子票** → Spec + 子票 → `Grand Builder` 编排 |

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
- **子票标签（Kip, 2026-11-02）：** Gate 过的子票照 Matt triage 打 `ready-for-agent`——不要因为是子票就扣着不打。
- **派工（Kip, 2026-11-02）：** 父票带 `spec` → **只**派 **Grand Builder** 编排整份 spec → **一个 PR**。**禁止**给子票开 lone Builder / 单独小 PR / 把子票当独立 `ready-for-agent` 去 claim 实施。子票上的 `ready-for-agent` 是 frontier / 就绪信号，不是「单独派 Builder」信号；心跳只 claim **父票**（或 Grand 已挂的 session），由 Grand 吃子票 DAG。

## 修复循环（in-review）：四项检查

每次 PR 更新后检查：

1. **review comments** —— 逐条对照 `ponytail` 判真假；真的修，假的逐条回复说明为何不是真问题
2. **merge conflict** —— 自己 rebase 解决，不推给 Kip
3. **CI failure** —— 修到绿；同类环境失败连续两次则升级
4. **PR 规范** —— `/pr` 格式的 body、UI 类必须有前后对比图、`Closes #n`

**上限 3 轮**。超过仍在 in-review → 转 `blocked`，附「每轮修了什么、还差什么」。

修 PR / 验收反馈：在**仓库 root session** 下开 Builder child（见 `use-lody` Feedback），不要并行两个 conversation 写同一 worktree。

## 验收（uat，不跑 CI）

- 逐条对照 PR body 里的验收标准与实际改动
- UI 类：真实页面截图与确认过的效果图并排比对，覆盖 loading / empty / error / 长内容 / hover
- 数据类：查库或 245 核实，不看 issue 留言
- 结论只有两档：**PASS**（可合并）/ **需要修**（退回 in-review，附具体条目）

合并永远由 Kip 做，任何 bot 都不 squash merge。

## 角色

- **owner bot**：立项、接 grill handoff、workload 收口、Brief/Spec 核对、UAT
- **orchestrator**（Gabe）：轮询推进、状态迁移、派工、催办
- **执行者**（Lody Builder / Grand Builder）：实现、修 PR（按 `build` 执行，提交身份见 `github-identity` / `bot-github-identity`）
- **Kip**：业务决策、进 Lody session 回答 grill、生产写入、合并

## 禁止

- 给派工后的票补 `in-review` / `uat` / `approved` 标签——这些状态是推导的，手打会与事实冲突
- 跳过 `ready-for-agent` 直接派工
- 用 issue 留言当「已完成」的证据（见 `work-board` 的核实纪律）
- Gabe 一轮轮询派多张票
- 让 `in-progress` 的票超过一天没人管而不处理
- 手选 Lody model / machine / agent-config（必须 `--agent-role`）
- 用 Grok Bot executor / Cindy `start_session_task` / `subagent` 顶替 Lody session
