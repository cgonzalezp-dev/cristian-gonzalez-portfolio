# Data model

Tables are Google Sheets tabs, hidden from normal view. `Schema.gs` is the single source of truth for every shape — `Bootstrap` creates tabs from it, `Repository` types values from it, and `Migrations` diffs it against the live sheet.

```
config_lob ──┬── config_metric_lob ──┬── config_metric ──┬── config_target
             │                       │                   └── (data_type drives every engine)
             │                       │
             ├── dim_agent ──────────┤
             ├── dim_team            │
             ├── dim_manager         │      config_period ──┐
             ├── dim_region          │                      │
             └── dim_cohort ─────────┤                      │
                                     ▼                      ▼
                          ┌────────────────────────────────────────┐
                          │  fact_metric_value_YYYY   (entered)     │
                          │  subject_type + subject_id + metric +   │
                          │  period + numerator + denominator       │
                          └────────────────────┬───────────────────┘
                                               │ Aggregation
                                               ▼
                          ┌────────────────────────────────────────┐
                          │  agg_subject_metric_period  (derived)   │
                          │  agg_delta                  (derived)   │
                          └────────────────────────────────────────┘
```

---

## Configuration

### `config_lob`

| Column | Type | Notes |
|---|---|---|
| `lob_id` | string | PK, **immutable** — renaming is free because nothing references the name |
| `lob_name` | string | Unique among active records |
| `description` | string | |
| `parent_lob_id` | string | Nesting, e.g. a service line under Customer Service |
| `sort_order` | number | Order in pickers and dashboards |
| `status` | string | `ACTIVE` / `INACTIVE` — **soft delete only**, history is never orphaned |
| `created_at` `created_by` `updated_at` `updated_by` | | |

### `config_metric` — the registry

The most important table in the system. The source analysis for this project found a 34-slide executive deck in which **not one metric had a written definition**, which is how the same KPI ended up computed against four different denominators inside one document.

| Column | Type | Notes |
|---|---|---|
| `metric_id` | string | PK, immutable |
| `metric_name` | string | Technical name, e.g. `Quality @ Uber - Experience` |
| `display_name` | string | What people call it |
| `definition` | string | **The formula, in words.** A metric without one is a metric two people will calculate differently |
| `category` | string | Grouping only |
| `data_type` | string | ⭐ `DATA_TYPE` — drives every engine |
| `unit` | string | `UNIT` — presentation; storage stays canonical |
| `decimal_places` | number | |
| `direction_of_success` | string | `HIGHER_IS_BETTER` / `LOWER_IS_BETTER` / `TARGET_BASED` |
| `aggregation_rule` | string | `SUM_RATIO` is correct for any proportion |
| `weight_field` | string | For `WEIGHTED_MEAN`, normally `denominator` |
| `default_frequency` | string | Pre-selects the period type on entry |
| `valid_min` / `valid_max` | number | Blocking range check |
| `requires_denominator` | boolean | |
| `numerator_label` / `denominator_label` | string | e.g. "Satisfied responses" / "Surveys received" |
| `instrument` | string | Operational CSAT ≠ survey CSAT. Different instrument ⇒ different metric |
| `source_system` | string | Provenance |
| `owner` | string | Who answers questions about this number |
| `min_sample_observation` | number | Per-metric override of the observation gate |
| `min_sample_cross_sectional` | number | Per-metric override of the population gate |
| `min_periods_control_chart` | number | Per-metric override of the history gate |
| `status` | string | Soft delete |

### `config_target` — effective-dated

| Column | Type | Notes |
|---|---|---|
| `target_id` | string | PK |
| `metric_id` | string | |
| `scope_type` | string | `AGENT` / `MANAGER` / `TEAM` / `REGION` / `LOB` / `GLOBAL` |
| `scope_id` | string | Empty for `GLOBAL` |
| `period_type` | string | Empty = applies to all frequencies |
| `target_value` | number | |
| `min_threshold` / `max_threshold` | number | Between threshold and target reads *at risk* rather than a miss |
| `stretch_value` | number | |
| `valid_from` / `valid_to` | date | ⭐ Empty `valid_to` = still in force |
| `notes` | string | Why this target, and who agreed it |

> Without effective dating, changing a target today silently rewrites every historical status and streak. Saving a new target **closes** the open one it replaces (`valid_to = valid_from − 1 day`) instead of overwriting it.

### `config_period`

| Column | Type | Notes |
|---|---|---|
| `period_id` | string | PK |
| `period_type` | string | `DAILY` … `CUSTOM` |
| `period_label` | string | ⭐ **Verbatim.** Never regenerated |
| `start_date` / `end_date` | date | |
| `sort_key` | string | ⭐ **Always `start_date`.** Nothing sorts by label |
| `year` `quarter` `month` `week_number` | number | Derived on save, for filtering |
| `calendar_id` | string | Parallel calendars — calendar vs fiscal vs internal |
| `is_closed` | boolean | Reserved for locking a closed period |

### `config_chart`

Full control over presentation, entirely decoupled from metric names: `chart_title`, `subtitle`, `description`, `footer`, `chart_type`, `metric_ids[]`, `lob_ids[]`, `period_type`, `period_count`, axis labels and bounds, `show_target_line`, `show_benchmark`, `show_data_labels`, `width`.

A metric called `Quality @ Uber - Experience` can appear on a chart titled *Customer Experience Quality*. The technical name is never forced into the presentation layer.

### `config_settings`

Key/value with a declared type. Everything in `DEFAULT_SETTINGS` is seeded on first run and editable in Configuration → System. Read them via `ConfigService.getSetting()` — referencing `DEFAULT_SETTINGS` at a call site would stop them being tunable.

---

## Dimensions

`dim_agent` · `dim_team` · `dim_manager` · `dim_region` · `dim_cohort`

`dim_cohort` holds **benchmark populations with no operator behind them** — the comparison groups a service is measured against. Without it, a cohort comparison has nowhere to live except a hardcoded chart. `population_definition` is required in spirit: a benchmark nobody can define is a benchmark nobody should be compared against.

---

## `fact_metric_value_YYYY`

Partitioned by year at the Repository layer. Holds **entered** data only.

| Column | Type | Notes |
|---|---|---|
| `fact_id` | string | PK |
| `idempotency_key` | string | ⭐ `hash(subject + metric + period + instrument)` |
| `subject_type` | string | `AGENT` / `TEAM` / `MANAGER` / `LOB` / `REGION` / `COHORT` / `GLOBAL` |
| `subject_id` | string | Resolves against the matching dimension |
| `lob_id` `team_id` `manager_id` `region_id` | string | Denormalised at write for filter speed |
| `metric_id` `period_id` `period_type` | string | |
| `period_start` | date | Denormalised — every sort and range filter uses it |
| `numerator` | number | ⭐ |
| `denominator` | number | ⭐ Sample size. Weights every rollup |
| `value` | number | Derived from num/den where both exist, so it is reproducible |
| `target_snapshot` | number | The target in force when written |
| `target_id_snapshot` | string | Which target that was |
| `unit_snapshot` | string | |
| `source` | string | `ENTRY` / `IMPORT` / `API` — never `ROLLUP` |
| `entry_status` | string | `DRAFT` / `SUBMITTED` / `APPROVED` |
| `quality_flags` | json | Non-blocking flags raised at write |
| `comments` | string | Context for whoever reads the number later |
| `version` | number | Increments on supersede |

### Why numerator and denominator are not optional

```
Agent A:  90 of 100 surveys  →  90%
Agent B:   4 of   4 surveys  → 100%
```

Without denominators:
- The population average is **95%**. The truth is 94/104 = **90.4%**.
- Agent B tops the leaderboard on four observations.
- Service Level (`answered_in_threshold / offered`) and AHT (`total_seconds / contacts`) cannot be rolled up correctly at all — every ratio metric is wrong.
- p-charts, funnel plots and any variable-limit control chart become impossible.

Where a denominator genuinely is unavailable, the value is still stored; the rollup degrades to `SIMPLE_MEAN` and every aggregate built from it carries `is_weighted = false` and an **unweighted** badge in the UI.

---

## Derived tables

Never authored by a human. Fully rebuildable from facts + config.

### `agg_subject_metric_period`

One row per (subject, metric, period). Carries `numerator_sum`, `denominator_sum`, `value`, plus its own provenance: `aggregation_rule` (which rule actually produced the value), `is_weighted`, `contributor_count`, `observation_count`, `target`, `status`.

### `agg_delta`

Pre-computed typed comparisons: `comparison_type`, `value_from`, `value_to`, `absolute_change`, `percent_change`, `pp_change`, `interpretation` (direction-aware), `n_from`, `n_to`, `reliable`, `streak_direction`, `streak_length`.

---

## System

`sys_audit_log` — every configuration change and value edit: entity, field, old value, new value, actor, timestamp. Only changed fields are logged.

`sys_error_log` · `sys_job_run` (with a resume cursor for chunked jobs) · `sys_schema_version`.

---

## Aggregation rules

| Rule | Formula | Use for |
|---|---|---|
| `SUM_RATIO` | Σnum ÷ Σden | ⭐ Every proportion and rate |
| `WEIGHTED_MEAN` | Σ(value × weight) ÷ Σweight | Durations, scores |
| `SIMPLE_MEAN` | Σvalue ÷ n | Fallback only — always badged |
| `SUM` | Σvalue | Counts, currency |
| `MEDIAN` / `MIN` / `MAX` / `LAST` / `COUNT` | | Ad-hoc analysis |

The UI constrains the aggregation picker by data type: you cannot select `SUM` on a percentage, because summing percentages is meaningless.

### Three different "averages"

`Aggregation.populationStats()` returns all three, separately labelled, because they answer different questions and are routinely confused:

| | Answers |
|---|---|
| **Population value** (weighted) | What the business actually delivered |
| **Mean of subjects** (unweighted) | What the typical subject delivered |
| **Median** | What the middle subject delivered — robust to outliers |

When the first two diverge materially, the gap is entirely down to unequal sample sizes. The insight engine says so explicitly rather than leaving the reader to guess which number is "right".
