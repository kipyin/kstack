---
name: cq
description: >
  cq: Lighthouse solvency Postgres query CLI. Use when reading task data,
  verifying written rows, comparing forecasts, or running result-line checks.
---

# cq

Read-only query and analysis CLI for solvency Postgres. Schema discovery, task context, filtered reads, diffs, views, and verifies — one entrypoint.

**When this skill applies**, use only `cq`. Skip ad-hoc `python -c` DB scripts and one-off files under `scripts/`.

**SSOT**: table names, columns, filter keys, and reader projections come from the codebase (`solvency/io/introspect.py`, `solvency/schema/`). Do not hardcode table lists in chat or in this skill.

## Entry

From the repo root, always with the project venv:

```bash
.venv/bin/python -m solvency.tools.cq <command> ...
```

## Steps

1. Confirm `.venv/bin/python` (not system `python3`).
2. Have a task id → `context <forecast_task_id>` (gets `forecast_times`, `version_map`).
3. Unknown table → `schema <table>` (columns + table kind).
4. Suspect column clipping → `schema <table>`, then check `read_columns_for()` projection in code.
5. Read → `read <table> ...` (filters from `build_read_filters` in `solvency/io/introspect.py`).

**Done when**: the needed rows or comparison is on screen (or JSON), using only `cq`, with filters taken from `schema`/`context` rather than guessed.

## Commands

```bash
.venv/bin/python -m solvency.tools.cq tables [--pattern <substring>]
.venv/bin/python -m solvency.tools.cq schema <TABLE>
.venv/bin/python -m solvency.tools.cq context <TASK>
.venv/bin/python -m solvency.tools.cq read <TABLE> --task <TASK> [--acc-period YYYYMM] [--period N] [--product CODE] [--basis BASIS] [--group-by COL ...] [--sum COL ...] [--json]
.venv/bin/python -m solvency.tools.cq diff <PRESET> --tasks <TASK_A> <TASK_B> [--period YYYYMM] [--json]
.venv/bin/python -m solvency.tools.cq view <PRESET> --task <TASK> [--period YYYYMM] [--json]
.venv/bin/python -m solvency.tools.cq verify <MODULE> --task <TASK> [--period YYYYMM] [--tolerance FLOAT]
```

`--json` for structured output; default is Rich tables. Preset names: `cq diff --help` / `cq view --help` / `cq verify --help`.

### Common presets (cache — prefer `--help` if stale)

| Kind | Name | Use |
| --- | --- | --- |
| diff | `result-line` | `crs_rpt_result_line` across two tasks |
| diff | `checkpoint` | checkpoint tables |
| diff | `tiers` / `headlines` / `periods` | PFS tiers, headlines, same-task periods |
| view | `pfs-tiers`, `headlines`, `mc-detail`, `reserve-breakdown`, `nb-scaled`, `dpl` | common rollups |
| verify | `old-cas`, `cross-pii`, `life-mc` | reserve / MC checks |

## Examples

```bash
.venv/bin/python -m solvency.tools.cq context 10703
.venv/bin/python -m solvency.tools.cq read crs_checkpoint_liab --task 10703 --acc-period 202612 --group-by basis --sum final
.venv/bin/python -m solvency.tools.cq view pfs-tiers --task 10703 --period 202612
.venv/bin/python -m solvency.tools.cq diff result-line --tasks 10703 13332 --period 202612
.venv/bin/python -m solvency.tools.cq verify old-cas --task 10703 --period 202612
```

## If `cq` cannot express it

Run `schema`, then read `solvency/io/introspect.py` / `solvency/schema/registry.py`. Extend introspect when the gap is real. Still no one-off scripts.

## Code map

| Piece | Path |
| --- | --- |
| CLI | `solvency/tools/cq/cli.py` |
| Filters / routing | `solvency/io/introspect.py` |
| Diff / views / verify | `solvency/tools/cq/{diff,views,verify}.py` |
| Registry / projections | `solvency/schema/{registry,views}.py` |
| Task bootstrap / readers | `solvency/io/loading/{task_context,table_reader}.py` |
