---
name: issue-title-convention
description: Lint and autofix open Gitee issue titles to the four team prefixes.
disable-model-invocation: true
---

# Issue Title Convention

Every open Gitee issue title starts with exactly one team prefix in square brackets:

- `[精算逻辑]` — solvency / actuarial calculation
- `[大模型]` — agent core: orchestration, skills, analysis engine
- `[平台功能]` — product shell: client, server, build, chat UI
- `[工程质量]` — trust layer: tests, guardrails, mutation, CI quality gates

This skill is an **autofixing linter**: scan open issues, find bad titles, rename. Run when titles pile up without prefixes or still carry legacy prefixes.

## Spec (SSOT)

One prefix, first, square brackets, space after `]`:

```
[精算逻辑] <rest>
[大模型] <rest>
[平台功能] <rest>
[工程质量] <rest>
```

Compliant iff the title starts with one of those four. Everything else is a violation.

### Strip legacy prefixes first

Noise once team prefixes exist (details live in body/parent):

- `Solvency(P1): ` / `Solvency(P2): `
- `cq: `
- `Discuss: `
- `Later wave: `

### Assign a team

Read title + body; classify by the *work*, not the tooling:

| 团队 | Work is… | Signals |
|---|---|---|
| 精算逻辑 | solvency calc: reserves, curves, IFRS17, risk factors | `crs_pfs_*`, 偿付能力, whatif |
| 大模型 | agent intelligence: orchestration, skills, reconcile/verify engine | `analysis/agent.py`, policy graph |
| 平台功能 | product shell around the agent | agent-ui, build --all, server lifecycle |
| 工程质量 | making code trustworthy | mutation, registry stability, quality-gate CI |

**Settled edges** (do not reopen):

- agent-ui / thin client / chat → `[平台功能]`
- reconcile/verify analysis engine → `[大模型]`
- cq enhancements for actuarial scenarios → `[精算逻辑]`
- tests that lock business numbers → `[精算逻辑]`; tests that guard structure/scaffolding → `[工程质量]`
- build/ship/release CI → `[平台功能]`; quality-gate CI → `[工程质量]`

If title + body still do not fit a team, **do not guess** — hold for step 4.

## Steps

### 1. Probe

```bash
gitee --remote gitee issue list --state open --json --jq '.[] | "\(.number)\t\(.title)"'
```

**Done when**: every open issue is listed.

### 2. Sort

Compliant (one of the four prefixes) → skip. Violation (missing or legacy prefix) → fix.

**Done when**: every issue is labeled compliant or violation; none pending.

### 3. Propose fixes

For each violation: strip legacy prefix → assign team → new title = `[<team>] <remainder>`.

**Done when**: every violation has a proposed title.

### 4. Hold low confidence

Ambiguous team → do not rename; collect for human. Only rename titles you would defend.

**Done when**: queued renames are high-confidence; the rest are listed as needs-human.

### 5. Rename

```bash
gitee --remote gitee issue edit <编号> --title "<新标题>"
```

`--title` replaces the whole title; body unchanged. Print old → new as you go.

**Done when**: every queued rename returned success.

### 6. Verify

```bash
gitee --remote gitee issue list --state open --json --jq '.[].title' \
  | grep -cvE '^\[(精算逻辑|大模型|平台功能|工程质量)\] '
```

Expect `0`. Then legacy residue must be empty:

```bash
gitee --remote gitee issue list --state open --json --jq '.[].title' \
  | grep -E 'Solvency\(P|cq: |Discuss: |Later wave: ' || true
```

**Done when**: zero violating open titles, zero legacy prefixes, held items reported.
