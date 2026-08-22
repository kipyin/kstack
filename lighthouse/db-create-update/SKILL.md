---
name: db-create-update
description: "Use when creating or updating PostgreSQL crs_/alm tables: paired _HIS history tables, COMMENT ON UI labels, and scope metadata with data_version_tag on version-scoped data tables but not on CONFIG tables."
---

# DB Create / Update (PostgreSQL)

## Overview

Persisted business tables use a sibling `{table}_HIS` (same columns). `COMMENT ON` text is the **frontend column/table title**, not a technical description.

Scope metadata must match how `load_inputs` reads tables (`solvency/io/schema/columns.py`, `load_policies_for_table`). Wrong keys break preflight and task loading.

**Violating the letter of these rules violates their intent.**

## When to Use

- New or altered `crs_*` / related solvency input, config, or output tables
- Migrations that must stay aligned with Python schema registry

**When NOT to use:** temp tables, one-off views. Connection strings do not belong in migration SQL — use the project Postgres client / env URL.

## Table classes (pick one before `CREATE`)

| Class | `LoadPolicy` | Scope column(s) | `data_version_tag` | Examples |
|-------|--------------|-----------------|--------------------|----------|
| Version-scoped **data** | `VERSION_SCOPED` (+ optional `PERIOD_SNAPSHOT`, `DCF_CASHFLOW`, `STAGE_PERSISTENT`) | `data_version_tag` | **Required** | `crs_discount_curve`, `crs_life_mc_fcst_eb`, `crs_risk_aggr_config`, `product_account_config` |
| **Config** (global, not versioned per task tag map) | `CONFIG` | none | **Do not add** | `t_conf_account`, `crs_mc_char_coeff_config` |
| Task master / budget inputs | `TASK_SCOPED` | `forecast_task_id` | No (use task row + `forecast_data_version` map for other tables) | `t_forecast_scenario`, `forecast_data_version` |
| Run **outputs** | (none of above) | `forecast_task_id` | Usually no | `crs_rpt_result_line`, `crs_calc_*` |
| ALM asset inputs | `ALM_TASK_SCOPED` | `alm_task_id` | No | `alm_res_position_cross2` |

**Your two rules mapped to code:**

1. **数据类** — default for new `crs_*` fact/config-with-version tables: include `data_version_tag NOT NULL`, register in `forecast_data_version` per task, and add `_version_scoped_*` grain in `columns.py`.
2. **配置类** — only tables in `_CONFIG_TABLES` (`t_conf_account`, `crs_mc_char_coeff_config`): **no** `data_version_tag`. If a table is versioned per forecast (e.g. `crs_cashflow_timing_config`), it is **data/version-scoped**, not CONFIG — it **needs** the tag.

## Standard metadata columns

### Loader contract (must match `columns.py`)

| Column | When | Role |
|--------|------|------|
| `data_version_tag` | Version-scoped data | Filter key; resolved from `forecast_data_version` |
| `forecast_task_id` | Task-scoped + outputs | Budget task id |
| `alm_task_id` | ALM tables | ALM task id |
| `prod_code` | Product-grain forecasts | Business key |
| `time` | Monthly forecast offset | Integer month index from valuation |
| `acc_period` | Budget period tables | `YYYYMM` / `YYYYMMDD` string |

NB model-point tables often add `prem_term`, `sex`, `age` after `prod_code` + `time` (see existing `crs_*_fcst_nb`).

### Physical platform audit (typical on persisted **data** tables)

Existing CRS rows also carry platform audit fields (fixtures / DB). Mirror siblings when creating new **editable** data tables:

| Column | Typical purpose |
|--------|-----------------|
| `id` | Surrogate PK |
| `version_id` | Often same value as `data_version_tag` on insert |
| `status` | Row status flag |
| `batch_no` | Optional batch |
| `effective_time` | Version effective timestamp |
| `create_user` / `create_time` | Create audit |
| `lastupdate_user` / `lastupdate_time` | Update audit |

`crs_calc_*` checkpoint tables use a different audit set (`create_time`, `batch_id`, …) — copy an existing `crs_calc_*` peer if adding explain output.

**Rule:** Python loader ignores most audit columns; still add them on user-facing data tables to match `_HIS` and the rest of CRS.

## Grain templates (version-scoped `crs_*` data)

```text
prod + time:     data_version_tag, prod_code, time, …business…
time only:       data_version_tag, time, …business…
tag only:        data_version_tag, …business…   (e.g. crs_discount_curve, crs_sarmra_rpt)
prod slice:      data_version_tag, prod_code, …business…  (e.g. crs_rein_term_config)
```

After DDL, update `solvency/io/schema/columns.py` (`TABLE_COLUMNS` + `_CONFIG_TABLES` / policy sets if needed) so `_needs_data_version_tag()` and loaders stay correct.

## `_HIS` + COMMENT ON

| Rule | Requirement |
|------|-------------|
| New base table | `CREATE` base + `CREATE {name}_HIS` identical columns |
| Column change | Same change on base and `_HIS` |
| `COMMENT ON` | Short Chinese **UI title**; no parentheses or explanatory prose |
| Comments | On base **and** `_HIS`; same text per column |

## Example: new version-scoped data table

```sql
CREATE TABLE alm.crs_example_metric (
    id                 BIGSERIAL PRIMARY KEY,
    data_version_tag   VARCHAR(64) NOT NULL,
    prod_code          VARCHAR(32) NOT NULL,
    time               INTEGER NOT NULL,
    metric_value       NUMERIC(20, 4) NOT NULL,
    version_id         VARCHAR(64),
    status             VARCHAR(8),
    batch_no           VARCHAR(64),
    effective_time     TIMESTAMP,
    create_user        VARCHAR(64),
    create_time        TIMESTAMP,
    lastupdate_user    VARCHAR(64),
    lastupdate_time    TIMESTAMP
);

CREATE TABLE alm.crs_example_metric_HIS (LIKE alm.crs_example_metric INCLUDING ALL);

COMMENT ON TABLE alm.crs_example_metric IS '示例指标';
COMMENT ON TABLE alm.crs_example_metric_HIS IS '示例指标历史';
COMMENT ON COLUMN alm.crs_example_metric.data_version_tag IS '数据版本';
COMMENT ON COLUMN alm.crs_example_metric_HIS.data_version_tag IS '数据版本';
COMMENT ON COLUMN alm.crs_example_metric.prod_code IS '产品代码';
COMMENT ON COLUMN alm.crs_example_metric_HIS.prod_code IS '产品代码';
COMMENT ON COLUMN alm.crs_example_metric.time IS '预测期';
COMMENT ON COLUMN alm.crs_example_metric_HIS.time IS '预测期';
COMMENT ON COLUMN alm.crs_example_metric.metric_value IS '指标值';
COMMENT ON COLUMN alm.crs_example_metric_HIS.metric_value IS '指标值';
```

## Example: CONFIG table (no `data_version_tag`)

```sql
CREATE TABLE alm.crs_example_global_coeff (
    insurer_type              VARCHAR(32) NOT NULL,
    tier_order                INTEGER NOT NULL,
    characteristic_coefficient NUMERIC(20, 8) NOT NULL
);
-- Mirror _HIS + COMMENT ON; do NOT add data_version_tag unless product owners
-- reclassify the table out of LoadPolicy.CONFIG.
```

## Checklist

- [ ] Table class chosen (data vs CONFIG vs task vs output)
- [ ] `data_version_tag` only on version-scoped **data** tables
- [ ] `_HIS` pair + mirrored alters
- [ ] `COMMENT ON` on base and `_HIS`, UI-safe Chinese
- [ ] `columns.py` (+ `forecast_data_version` usage) updated for new logical tables

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "It's config so skip version tag" | Versioned CRS config (`crs_risk_aggr_config`, timing, product map) **uses** `data_version_tag`. Only `_CONFIG_TABLES` omits it. |
| "Loader only needs business columns" | Missing tag column breaks real DB loads and preflight. |
| "Add tag to mc_char_coeff for safety" | Violates CONFIG contract; table is global. |

## Red flags

- Version-scoped `crs_*` `CREATE` without `data_version_tag`
- `data_version_tag` on `crs_mc_char_coeff_config` or `t_conf_account`
- `ALTER` / `COMMENT` only on base table
- UI comments with parentheses or units