---
name: issue-summary
description: Add a Chinese nav summary + HITL checklist to a ready-for-agent Gitee issue.
disable-model-invocation: true
---

# Issue Summary

Add a navigation comment on a `ready-for-agent` Gitee issue: where it sits in the plan, and how a human verifies the implementation agent's output. Audience is the accepting human (often actuarial). The summary *is* the verification checklist — not a tutorial.

## When

Open issues only, once labeled `ready-for-agent`, before the implementer starts.

**Gate — is it actually ready?** Read the body plus parent / blockers. Confirm enough contract to write a concrete HITL list: logic/algorithm, verification expectation (golden or observable), change scope, entrypoint, interfaces. If a checklist step would need invented commands or goldens, switch the label to `needs-info`, list what is missing, and stop. Do not invent a summary.

## Steps

### 1. Standalone or child ticket

Read the body. Child: has `## Parent` or belongs to a sliced feature set. Standalone: no parent.

**Done when**: one sentence names which kind it is.

### 2. Place in the plan

**Child**: one mermaid dependency graph for the whole slice (`graph TD` / `flowchart` / `sequenceDiagram` only — Gitee's engine). Node ids = issue numbers (`IK3MES`). No custom themes or click handlers. Below the diagram, one locator line:

```
本 issue：<编号>  <-- YOU ARE HERE（方位词）
```

**Standalone**: no diagram. List blockers and known dependents.

**Done when**: a reader can say where they are, what blocks them, and what they unlock.

### 3. Background and goal

Three beats in plain language:

- **大任务**: what the epic/parent is doing (from parent problem/solution; no jargon dump).
- **这个 ticket 是 …**: stage inside that epic (setup, deepen, finish).
- **这个 ticket 的目标**: what becomes usable after delivery. Cite frozen field names from the parent contract; skip implementation detail.

Prefer the words「这个 ticket」over「这张／本票」.

**Done when**: without reading acceptance criteria, a reader can state epic background, this ticket's stage, and post-delivery capability.

### 4. HITL section

Follow「HITL 怎么写」below.

**Done when**: a human can execute each step and mark pass or fail without guessing.

### 5. Publish on Gitee

Chinese throughout. Edit an existing comment or create one:

```bash
gitee api -X PATCH repos/<owner>/<repo>/issues/comments/<comment_id> -F body=<新内容>
```

**Done when**: the comment is on the issue and mermaid/code fences render on Gitee.

## HITL 怎么写

HITL raises human *comfort*. It does not re-run unit tests. Ask first: which behaviors do automated checks already cover? Leave those out.

Cover only what needs a human: end-to-end product use, actuarial judgment of numbers, UX/sensory checks, human-readable docs.

Each HITL item has three parts: **做什么** + **操作或命令** + **expectation**.

- **可照做**: full commands (args + where values come from) or explicit UI/agent steps. If the entrypoint is this ticket's job and still undefined → `needs-info`, do not placeholder. If it waits on an upstream ticket → placeholder plus「等 #XXX 确定后替换」. Bare `<触发 X 的命令>` is not allowed.
- **看得到对错**: expectation states pass vs fail *and* what the human should see (status/fields, golden magnitude, UI reaction, answer must-include, doc wording). Prefer a short example when possible.
- **无教学，也不论证**: no「这验证了…」「test 覆盖不了…」. Fail cases in plain failure language.

### Vehicle

Pick the form from the verification object (not a fixed template):

| 验证对象 | vehicle | expectation |
| --- | --- | --- |
| HTTP / API | hit the endpoint | status + field names |
| 精算 / 数值 | input scenario vs computed numbers | golden or boundary |
| 大模型 / 流程 | run the flow | contract points met |
| 工具 / CLI | run the command | output shape |
| UI | open app + checklist | visible reaction |
| 构建 / 部署 | build or deploy | artifact + doc wording |

### Golden

Precise expectations only where an independent correct answer exists. LLM prose, animation, timing stay descriptive. Wrong precision is noise.

Humans supply golden *data*; the implementer owns test *code*.

### Format

- Commands in fenced blocks; UI as numbered lists.
- Python via `uv run` (do not assume an open venv).
- Gitee issue refs in prose use `#IK3MES`; mermaid node ids stay bare.
- Placeholders `<NAME>` always say where the value comes from.
- Preconditions (server up, env, task id) at the top of that HITL block.

Samples for six vehicles: [EXAMPLES.md](EXAMPLES.md). Reuse the writing shape; re-pick the vehicle for this ticket.
