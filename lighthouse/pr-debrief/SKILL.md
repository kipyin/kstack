---
name: pr-debrief
description: 给 PR 出一份业务验收 debrief：在做什么 / 做对了吗 / 真人要验什么，人话，贴到 Gitee。
disable-model-invocation: true
---

**debrief** 把一个 PR 说清楚，让业务验收人能做决定。

## 贯穿全局

- **人话、没代码、不分角色**（验收人有起码的开发知识）。「在做什么」用业务话写（业务验收人日常的词汇：领域、流程、结果）；「做到了吗」「真人验证」可以包含技术细节。
- **有话则长，无话则短** - 没有新内容的压缩成一行或删掉，不要为一行 typo 撑出三节。
- **debrief 只管业务验收**；lint、类型检查、build 这类工程检查交给 CI 和 agent 管理，不写进 debrief。

## debrief 长什么样

### 1. 这个 PR 在做什么

- **benefit** - 用户/业务能感知的行为变化，分开标记「新增能力」和「改变已有行为」（例如「之前运行某个任务会失败，现在能顺利运行」）。
- **blast radius** - 改动了哪个业务领域或系统边界（例如某条业务流程、某个对外接口、数据库结构）。
- **cost** - 只讲这个 PR 让运行变贵，或者让后续 agent 更难维护的地方；没有就一句「无新增成本」。**不含开发时间**（开发时间交给 agents 管理，大项目拆分成几个 PR 就行）。

### 2. 这个 PR 做到了吗

**验收 checklist** - 固定的几项（pytest / dry-run / golden cases，直接用名字）+ 按需添加项（业务话，不生造技术名词）。每项是下面三种之一：

- ☑ 做了并且通过
- ☐ 不适用，后面注明理由（理由站不住，验收人会追问）
- ☐ 空着不写，表示适用但没有做（是个缺口）
- 运行失败的 check 按 blocker 处理，不算空着的那种。

例：
```
☑ pytest 全量通过
☐ dry-run：不适用 - 本 PR 不涉及数据流
☐ golden cases
```

**spec 覆盖**（Issue 中有 spec / Agent Brief 时）：覆盖了什么 / 漏了什么 / 多了什么（scope creep）。

**blocker** - 只放「合并后会出严重后果」的：数据丢失 / 核心计算算错 / 破坏契约 / 应该做校验的地方没有校验 / 数据悄悄出错 / 默认行为；nitpick 不进。

**没有 spec / golden 时**：保底是 dry-run + pytest 全量通过；纯优化工作添加一句「为了 X 做了 Y」。

### 3. 还要真人做哪些验证

**真人验收** + guidance。每项包括：看什么 / 为什么 agent 做不了 / 补上哪个覆盖缺口。重点关注 benefit 里「改变已有行为」的项（可能改坏已有功能）+ checklist 没有覆盖的缺口 + PR 评论里没结论的开放问题。

### 收尾

通过 / 退回修改哪几条（指明哪些 checklist 项没有做、哪些是 blocker）/ 需要补哪些真人验证。让真人选择，不替真人决定。

## 怎么保持诚实

debrief 和 PR 同源，PR 错 debrief 也会错：

- 运行通过的事实（golden / dry-run / pytest）当作事实汇报 - 这些能重新运行，agent 藏不了。
- benefit、cost、动机都是 agent 自报的 claim，由「真人验收」清单指出。
- 不打 per-line 标签 - 事实和 claim 上面已经分开，不用再额外标注。

## 流程

1. **锁定 PR 和基线。** 解析 PR、head、base、关联 issue；fetch；merge-base；diff stat + commit list；拉 PR 评论。在干净 worktree 检出 PR 分支。空 diff 在这里失败。（worktree 约定、拉评论的 curl 见 gitee-pr-review。）
   - 完成：PR head / base / issue 已经解析，PR 分支已经检出，评论已经拉到，diff 非空。
2. **拿到 spec 和 golden。** 从关联 issue（wayfinder / grill-me 产出）或者 spec / golden 文件拿到。没有就记录「没有 spec 和 golden」。
   - 完成：要么拿到 spec + golden，要么明确记录「无 handoff」。
3. **运行固定的几项检查。** 运行 golden（有则）/ dry-run / pytest 全量，记录每项状态（做了 / 不适用 + 理由 / 没有做 / 运行失败）。按需添加业务话验收项。
   - 完成：固定的几项检查每一项都有状态，不适用的一律带理由，没有悄悄省略的。
4. **运行独立 blocker 扫描。** 委托 code-review / review-diff，只保留 blocker；PR 评论里已经提的问题也算进来（不重复报，但要列出来）。
   - 完成：blocker 列表（可以为空）已经取出，评论里提过的问题已经并入。
5. **写 debrief。** 按「debrief 长什么样」填写三节 + 收尾。
   - 完成：三节都写了，收尾的选择也列出来，没有内容的节压缩成一行或删。
6. **渲染、发出去。** markdown 当作 PR 评论（主），可选再出一份 HTML 本地看。先给用户看，批准后发。
   - 完成：markdown 已经写入文件，用户已经看过，批准后已经发出（或只本地预览）。

## 发评论

发评论使用 gitee CLI，机制和已知问题（inline comment 坏、decode bug、`--body "$(cat file)"`、无 em dash）参见 `gitee-pr-review`。
