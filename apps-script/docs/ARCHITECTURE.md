# Architecture

## Layers

```
┌──────────────────────── PRESENTATION (HTML Service) ─────────────────────────┐
│  Index · Styles · Components · Charts · Views · ViewsConfig · Scripts         │
│  Custom design system. No framework, no CDN, no external request.            │
└─────────────────────────────── google.script.run ────────────────────────────┘
┌──────────────────────────── API / ORCHESTRATION ─────────────────────────────┐
│  Api.gs    one entry point, one dispatch table, one error envelope           │
│  Auth.gs   role resolution and capability checks                             │
└──────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────── ENGINES ─────────────────────────────────────┐
│  ConfigService · PeriodEngine · Validation · Aggregation · DeltaEngine        │
│  MaterializedViews · Dashboard · InsightEngine · ChartConfig                  │
│              ↑ all dispatch through MetricStrategy's data-type table          │
└──────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────── DATA ACCESS ─────────────────────────────────────┐
│  Repository.gs  · Infra.gs (cache, lock, log, budget) · Schema.gs            │
└──────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────── GOOGLE SHEETS (storage) ─────────────────────────────┐
│  config_*  (small, cached)  │  fact_*  (year-partitioned)  │  agg_* (derived) │
└──────────────────────────────────────────────────────────────────────────────┘
```

**One rule holds the layering together:** only `Repository.gs` calls `SpreadsheetApp`. No engine, no read model and no screen knows the data lives in a spreadsheet. That is what makes the migration path real rather than aspirational.

---

## Design decisions and their reasons

### One polymorphic fact table, not two

An agent's CSAT, an LOB-level Service Level typed in directly, and a benchmark cohort's defect rate are structurally identical — they differ only in **what the subject is**. `fact_metric_value` carries `subject_type` + `subject_id`, so one table serves every grain and every engine is written once.

**Why it can't double-count:** the fact table holds *entered* data only. Anything the aggregation engine derives lands in `agg_*`. When both a typed-in LOB value and a rollup of its agents exist, the read model prefers the typed-in value and the UI can show both as a reconciliation check.

### Materialised views are the performance strategy

Dashboards never scan facts. `agg_subject_metric_period` holds one row per (subject, metric, period), collapsing a 200-agent LOB-year from ~104,000 fact rows to ~52 rollup rows.

- **Incremental** (`refreshSlice`) runs inline with each submission and touches only the agent, team, manager, region, LOB and global slices that write affected — six rows, sub-second.
- **Full** (`rebuildAll`) runs nightly, chunked by period with a `Budget()` guard. On hitting the safe runtime ceiling it returns `PARTIAL` with a cursor and resumes next run.

### Three independent sample-size gates

Conflating these is how small-sample nonsense reaches a dashboard:

| Gate | Question | Default | Consequence below threshold |
|---|---|---|---|
| **POPULATION** | How many subjects in the comparison group? | 10 (30 preferred) | No outlier classification; values shown, unranked |
| **OBSERVATION** | How many observations behind *this* value? | 20 | Value greyed with an `n=` badge, excluded from ranking and from population statistics |
| **PERIOD** | How many periods of history? | 20 | Run chart only — no control limits drawn |

Each produces its own message. One generic *"not enough data"* would train people to ignore all three.

### Blocking validation vs non-blocking quality flags

| | Blocks the write | Examples |
|---|---|---|
| **Validation** | ✅ | numerator > denominator on a proportion; value outside the configured range (`CSAT = 145%`); denominator of zero |
| **Quality flag** | ❌ | sample below threshold; value more than 3σ from the subject's own history; entered value disagrees with its own arithmetic |

Blocking everything suspicious trains people to work around the tool. Flagging nothing lets bad data through silently. Flags are stored on the row, surfaced in the UI, and filterable.

### Idempotency instead of duplicate detection

Sheets has no unique constraint. Every fact carries `idempotency_key = hash(subject + metric + period + instrument)`. Resubmitting the same logical measurement **supersedes** the prior row and increments `version`; it never creates a second truth for the same cell.

`instrument` is part of the key on purpose: an operational CSAT and a survey CSAT for the same team and week are different measurements, not a duplicate. (They will also disagree — and must never be averaged together.)

### Re-entrant locking

Sheets has no transactions, so every write path runs through `withLock()`. It tracks depth, because composite operations legitimately nest — seeding a starter configuration calls `saveLob`, then `save` (period), then `saveTarget`, each of which locks. Without depth tracking the first inner `finally` would release the lock mid-operation, which is worse than no lock at all because it looks like it works.

### Per-execution read cache

One submission legitimately reads the same fact partition three times: the idempotency lookup, the subject's history, then the rollup refresh. At 130,000 rows a year that is three full `getValues()` calls per save, and a 200-row bulk grid would make six hundred.

`Repository` memoises the **raw cell values** per execution and re-maps fresh objects on every `readAll`. Callers routinely decorate rows (adding `rank`, `period_label`, gate messages) and sharing mutable objects would let one caller's annotations leak into another's data. Every write invalidates its own table, so a read-after-write in the same execution always sees the write.

### Configuration caching

`config_*` tables are read on nearly every request and change rarely. `Cache` wraps `CacheService` behind a **version stamp** in Script Properties; any config write bumps the version, invalidating every derived key at once. No per-key bookkeeping, no stale config after an edit.

Datasets are deliberately *not* cached — `CacheService` caps at ~100KB per key, which a fact slice blows through immediately. Materialised tables are the answer to read performance.

### Target resolution

Most specific wins, first match returned:

```
AGENT → MANAGER → TEAM → REGION → LOB → GLOBAL
```

Within a scope, a target whose `period_type` matches beats a generic one; then the most recently effective wins. The resolved target is **stamped onto the fact row at write time** *and* re-resolvable at read — so you can see both "the target we were held to" and "the target as configured today".

### Period ordering

Three rules make free-text labels safe:

1. **The label is preserved verbatim.** `Week 31`, `Week 31 - July`, `August W1`, `Q3 W1` — never regenerated.
2. **`sort_key` is always `start_date`.** `Week 31` string-sorts before `Week 4`, and `August W1` doesn't sort at all. Every axis, column and trend derives its order from dates. There is a guard test for exactly this.
3. **"Previous period" is the nearest earlier start date** of the same type and calendar — not `week_number − 1`, which breaks at year boundaries, breaks on custom labels, and silently compares across a gap when a week is skipped.

`calendar_id` supports parallel calendars (calendar vs fiscal vs internal weeks) without collision. Overlapping periods of the same type are rejected at entry, because two weeks covering the same day double-count every rollup that touches them.

---

## Request lifecycle

```
Browser
  └─ API.call('data.submit', payload)
       └─ google.script.run.api(action, payload)
            ├─ Api.gs        route lookup → Auth.require(capability)
            ├─ Facts.submit
            │    ├─ ConfigService.getMetric        (cached)
            │    ├─ PeriodEngine.get               (cached)
            │    ├─ Validation.validateEntry       blocking + flags
            │    ├─ MetricStrategy.deriveValue     value from num/den
            │    ├─ ConfigService.resolveTarget    precedence + effective date
            │    ├─ Validation.historicalChecks    jump detection
            │    └─ withLock
            │         ├─ idempotency lookup → insert or supersede
            │         └─ MaterializedViews.refreshSlice   6 slices
            └─ envelope { ok, data, meta:{ms, role} }
```

Errors: `AppError` is user-facing and passes through verbatim. Anything else is logged to `sys_error_log` and replaced with a generic message, so internal detail never reaches the client.

---

## Extending it

**A new metric, LOB, period, target or chart** — use the UI. No code.

**A new kind of mathematics** — add an entry to `STRATEGIES` in `MetricStrategy.gs` and a `DATA_TYPE` constant. Every engine picks it up. This should happen approximately never; the seven shipped types cover percentages, scores, durations, counts, rates, money and index scores.

**A new column** — declare it in `Schema.gs`. `Bootstrap.migrate()` appends it to the live sheet on next run. Migrations are additive only; nothing is renamed, reordered or dropped by an upgrade, and `Repository` maps by header name rather than position so a manually reordered sheet still reads correctly.

**A new screen** — add `render(container, params)` to `Views`, register it in `Router.routes`, add a nav item.

**A new API action** — add an entry to `ROUTES` in `Api.gs` with its required capability.
