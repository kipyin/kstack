---
name: work-board
description: >-
  Use when a bot starts, advances or finishes LightX work that must appear on
  the lightxlab board (Project #4), when checking or setting the board's Owner
  or Priority, when syncing the work list with Kip, or when checking whether
  effort drifted from what is due. Covers the board, 看板, todo list, queue
  order and who owes what.
---
# work-board

LightX 未完成工作的 **SoT 是 org Project #4**。只有真实 issue（及其 PR），没有草稿件，不用 Todoist 当 bot 看板。

## 常量

- **Project**：`lightxlab` org 的 [#4 LightX bot work queue](https://github.com/orgs/lightxlab/projects/4)。不要用也不要改 #1–#3（那是产品路线板）。
- **范围**：只 `lightxlab`，不含 `kipyin`。写法统一 **lightX / LightX**，不要 `light*`。
- **Owner（不是 Assignees）**：Project 单选字段 **Owner** 填 bot 短名（`clara` / `vera` / `iris` / `felix` / `owen` / `nora` / `theo` / `gabe`）。GitHub App 账号**不能**做 issue Assignee（平台限制）。Kip 和催办一律按 **Owner** 过滤。
  - field id `PVTSSF_lADOFBTO084BoYLmzhm4pMA`
  - 选项：`clara`=`49d30106` · `felix`=`53c84791` · `vera`=`cbf60280` · `iris`=`4ff82c1b` · `theo`=`620e55a1` · `gabe`=`53890670` · `nora`=`bfb79745` · `owen`=`4aa77569`
- **Priority**：单选字段 `P0`/`P1`/`P2`/`P3`，是**队列顺序**（现在谁先做），不是长期事实，也不是 issue 标签，也不是 Phase。
  - field id `PVTSSF_lADOFBTO084BoYLmzhm4yLE`
  - 选项：`P0`=`8969a7a0` · `P1`=`9b06306d` · `P2`=`12b8ca92` · `P3`=`3f1de815`
- **Status**：只有 Todo / In Progress / Done（生命周期），不要往里塞优先级或阶段。
- **Project id**：`PVT_kwDOFBTO084BoYLm`

## 规则

1. **没上板就不算开工。** grill、build、验收、派工之前：issue 存在、在 #4 上、**Owner 是你**。
2. **一切都是 issue。** 非代码工作也在对应 repo 开真 issue 再上板，不留 Todoist 或草稿旁路。
3. **只凭证据关闭**，且证据要和动作匹配，必须来自**代码库和/或数据库（含 245）**，不能来自记忆或 issue 留言：
   - PR 类 → 那个 PR 真的 merged（必要时 `Closes #n` 关掉），对着 repo/main tip 核实过
   - issue-only / 部署 / 数据类 → 交付物在代码或 DB 里可见，附你真跑过的链接或查询
   - Kip 说取消/关闭 → 关掉并注明
4. **口头不算。** 聊天、记忆、issue 留言、「差不多了」都不关板、都不算 Done。
5. **产品板分开。** #1/#2/#3 是路线视图；一个 issue 可以同时在产品板和 #4 上，#4 只追谁欠什么。
6. **绝不把 bot 设成 Assignee。**
7. **Spec 算一条待办**（Kip 2026-10-23）：带 `spec` 标签的父 issue 算**一条**，#4 上只挂父。原生 sub-issue **不要**加到 #4，也不算独立待办。
8. **Priority 就是队列顺序**：Kip 或催办让改就改，不要另造一套（标签、Phase、Todoist 排名）。

## 每个关卡的动作

1. **定位 issue**（repo + 号）。没有就先在 owner 身份下开一个；`spec` 父下的子票，板上目标是**父**。
2. **确保在板上**：`gh-as <bot> project item-add 4 --owner lightxlab --url <issue-url>`（已是 spec 父的原生 sub-issue 就跳过）。
3. **确保 Owner** 是你的短名。
4. **确保 Priority**（Kip 或催办给过的话）。
5. **收尾前**回看 #4 上 Owner=你的未完成项，按规则 3 拿证据后再关或改 Status。

## 命令行

先读 `github-identity`，所有 lightxlab Project 写操作都走 `gh-as <bot>`（App 自 2026-10-23 起有 `organization_projects: write`）。

```
gh-as <bot> project item-edit --id <item-id> --project-id PVT_kwDOFBTO084BoYLm \
  --field-id PVTSSF_lADOFBTO084BoYLmzhm4pMA --single-select-option-id <owner-option-id>
gh-as <bot> project item-edit --id <item-id> --project-id PVT_kwDOFBTO084BoYLm \
  --field-id PVTSSF_lADOFBTO084BoYLmzhm4yLE --single-select-option-id <priority-option-id>
```

flag 变了以 `gh project` 的实时帮助为准。

## 和 Kip 对清单

清单是**工作草稿**，不是冻结的事实。改写之前先用一句话问他有没有变化（做完 / 砍掉 / 新增 / 改期）。

同步时：读当前清单（带日期）→ 每条改成「动词 + 对象 + 近期期限」→ 更新记忆里的薄副本。

只有**那个动词要的结果**被证据确认时才关闭；只完成其中一步就把标题改成剩下的动词、保持未完成。最近的 git 活动本身不算完成。

## 漂移检查

三个信号：当前 #1 / 到期项、Kip 最近在这轮的要求、力气实际花在哪（相关 repo 的 commit/PR、和其他伙伴的最近对话）。

- 明显跑偏 → 一句话 handoff：一行说清不匹配，再给最省的纠正
- 在轨 → 保持安静

## 核实纪律（Kip 2026-10-23）

任何「做完了 / 落地了 / 还开着」的结论：**禁止凭记忆、禁止只看 issue 留言**，必须去代码库和/或数据库（含 245）取证据。聊天和留言只能指路，不是证据。
