---
name: solvency-agent-playbook
description: >
  solvency playbook: use at the start of any solvency/ work — develop, debug,
  test, refactor, or query. Covers edits under solvency/, solvency pytest,
  Postgres reads/writes for solvency tables, and solvency diffs.
---

# solvency-agent-playbook

Workflow layer for the insurance solvency forecast module (`solvency/`).
Sits on top of root `AGENTS.md` (Ponytail, writing, engineering). On conflict, `AGENTS.md` wins.
Chinese wording follows `ZH_STYLE_GUIDE.md`. Paths are relative to the Lighthouse repo root.

## Stance

Primary risk is **semantic error**: wrong regulatory meaning beats a crash because it ships silent bad numbers.
Default: **confirm口径 → read code → then write code.**

Layers (top → bottom): `orchestrator` → `io/loading` → `io/adapters` → calc packages (`actual_capital`, `minimum_capital`, `new_business`, `discounting`) → `reporting` → `io/writing` → `deploy`.
Name the layer before editing; cross-layer changes verify each layer's contract.

## 1. Open every task with Why

First reply or first todo must be these four lines, one sentence each:

```
目的：<监管/业务目的>。
改动：<层与文件路径>。
完成判据：<测试命令+预期，或数值核对方式>。
影响半径：<grep 调用方，或「仅本文件」>。
```

Missing any line means not started. 「期」= 预测期; slices inside a period are 「段」(`ZH_STYLE_GUIDE.md`).

### Before coding

- New behavior / creative work: grill口径 first (Matt `/grill-with-docs` or `/grill-me`); 2–3 options; no implementation until the design is agreed.
- Multi-step with a clear spec: write a dated plan under `docs/plans/` (and specs under `docs/specs/`) with per-step acceptance.
- One-line change, pure query, pure investigation: skip the full planning loop; the four-line opener still required.

### When the ask is foggy

1. Read code/docs under `docs/solvency/` (handbooks, 偿二代条文).
2. Read tests: `tests/solvency/unit/`, `tests/solvency/regression/golden/` — assertions are the behavior contract.
3. Only then ask a human: one question, prefer choices, cite what you already checked and two candidate readings.

## 2. Edit discipline

- Read the target code until you can explain why it looks that way, then edit. Re-read in long sessions.
- Grep all callers before changing a shared function; fix the root, not the symptom site.
- Never touch derived trees: `__pycache__/`, `.venv/`, `cache/`, `log/`.
- Durable state lives in files (`docs/plans/`, todos), not chat memory.

| Carrier | Holds |
| --- | --- |
| `AGENTS.md` | universal rules |
| `.agents/skills/` | reusable ops (cq, Gitee PR, …) |
| `docs/plans/`, `docs/specs/` | per-task anchors |
| `docs/solvency/` | design + regulatory notes |
| `tests/solvency/` | behavior contract / numbers |
| `ponytail:` comments | local known limits |

## 3. Prove it

- Untested code is not "green". Untouched output is not citable.
- Every "done" ships evidence: command + summary + exit code, or path:line you re-read with a tool.
- Before claiming done: re-run the proving command now. Old output and "I ran it earlier" do not count.
- Label speculation as speculation.

### Tests

```bash
.venv/bin/python -m pytest tests/solvency/unit -x -q
.venv/bin/python -m pytest tests/solvency -q
```

Markers: `unit`, `integration`, `golden`, `production`, `live_db` (excluded by default). Prefer the directed group for the layer you touched, then full suite.

### Bug loop

1. Smallest failing test first; watch it red.
2. Fix the root cause.
3. Watch it green.
4. Nearby unit group at minimum.

No "fix then patch the test". Two failed fix attempts → reopen diagnosis instead of more patches.

### Numbers

Green tests ≠ correct口径. New/changed calc needs a hand-checkable micro-example asserted as a concrete number. Shortcuts on curve segments, CSM carrier dedupe, or NB scaling are bugs (`AGENTS.md`).

### Database

For Postgres reads, written-row checks, or input-table investigation: follow `.agents/skills/cq/SKILL.md` and use only `cq`.

## 4. Parallelism

Parallel only when subtasks are independent with their own completion criteria.
One domain per subagent. Shared-context bugfixes and same-file edits stay serial.
Delegation prompts carry full context (Why, known facts with path:line, single deliverable, acceptance command, out-of-scope).
Spot-check critical subagent claims by re-reading one cited line or re-running one command.

## 5. Capture lessons

After a task, if you repeated a query, used the wrong slice, wrote a one-off script, or burned >2 tries on one pit: write it down once, in the right carrier (table above). Prefer a reusable skill under `.agents/skills/` when the next time is "one command away".

Commits: Conventional Commits; body says why. No `Co-Authored-By:` / "Generated with…" footers. PR flow: `.agents/skills/gitee-pr-workflow/SKILL.md`.

## 6. Stop and ask a human when

- Destructive: drop tables, force push, overwrite prod data/config.
- Regulatory口径 still unclear after code + `docs/solvency/`.
- Ask contradicts what tests assert.
- Change radius grows past the original task.

Ask with: places checked, two options, your recommendation.

Keep going for reversible work, self-answerable greps/`cq`, and failing tests (including pre-existing — see `AGENTS.md`).

Retry budget: same method twice without new evidence → change approach; four attempts with no progress → report observations and ask.

### Report shape

```
结论：<done or blocked>。
证据：<command/result or path:line>。
未完成：<list or「无」>。
建议：<next step or decision needed>。
```

## Skill pointers (reach when needed)

| Skill | When |
| --- | --- |
| `cq` | Postgres task data / written-row checks |
| `tdd` / `diagnosing-bugs` | implement or hard bugs |
| `implement` / `to-spec` / `to-tickets` | Matt ticket flow |
| `code-review` | Standards + Spec review of a diff |
| `gitee-pr-workflow` | commit / push / Gitee PR |
| `db-create-update` | create/alter `crs_`/`alm` tables |
| `grill-with-docs` | sharpen design + domain docs before coding |
