# Operations Performance Platform

A configuration-driven reporting platform built on Google Apps Script and Google Sheets.

Every line of business, metric, reporting period, target and chart is created at runtime through the interface. **Adding a metric, an LOB or a reporting period never requires a code change or a redeployment.**

---

## What "configuration-driven" means here

The architectural rule this codebase is built around:

| | |
|---|---|
| ❌ **Forbidden** | branching on metric *identity* — `if (metric.name === 'CSAT')` |
| ✅ **Required** | branching on metric *type* — `if (metric.data_type === 'PROPORTION')` |

Some branching is unavoidable: a percentage and a duration genuinely need different arithmetic, and pretending otherwise produces *"AHT improved by 9.3%"* where it should say *"40 seconds"*. So the engines branch exactly once — in [`MetricStrategy.gs`](MetricStrategy.gs), on a declared data type — and every metric anyone creates simply picks one.

| `data_type` | Change expressed as | Rolls up as | Control chart¹ |
|---|---|---|---|
| `PROPORTION` | percentage points | sum ÷ sum | p-chart |
| `ORDINAL_SCALE` | points | weighted mean | X̄-S |
| `DURATION` | seconds (`m:ss`) | weighted mean by volume | I-MR |
| `COUNT` | absolute | sum | c-chart |
| `RATE_PER_UNIT` | per unit | sum ÷ sum | u-chart |
| `CURRENCY` | absolute + % | sum | I-MR |
| `INDEX_SCORE` | points | weighted mean | I-MR |

¹ Chart families are declared now and used by the statistics phase.

Adding **Forecast Accuracy** is a form submission: name it, pick `PROPORTION`, set direction `TARGET_BASED`, target 95%, thresholds 92/98. It immediately appears in data entry, deltas render in pp, status compares against thresholds, and the insight engine writes *"Forecast Accuracy is 1.8pp below target."* No deploy.

---

## The three rules that make the numbers correct

### 1. Ratios aggregate as sum ÷ sum, never as an average of ratios

```
Agent A:  90 of 100 surveys  →  90%
Agent B:   4 of   4 surveys  → 100%

Average of the ratios ......  95%     ← wrong
Ratio of the sums ..........  90.4%   ← right
```

Averaging agent-level percentages is wrong whenever agents have different denominators — which is always. Every population average, LOB rollup and peer comparison in the platform depends on this. It is why numerator and denominator are captured, not just a value.

Where a denominator genuinely isn't available, the rollup degrades to a simple mean **and is visibly badged "unweighted"**. Honest degradation, never silent wrongness.

### 2. Deltas are typed

Three different comparisons must never share one visual language:

| Type | Reads as |
|---|---|
| `VS_PRIOR_PERIOD` | `+4.0pp vs Week 30` |
| `VS_TARGET` | `3.5pp below target` |
| `VS_COHORT` | `+152bps vs All Riders` |
| `VS_ROLLING_AVG` | `+1.2pp vs 4-week average` |

This exists because the source analysis for this project found an executive deck where "Δ +152 xbps" was a gap between two *cohorts*, not a movement over *time* — but it sat beside a plus sign and a trend chart, so every reader took it for a trend. `comparison_type` is mandatory, travels with the number, and renders differently in the UI.

### 3. Configuration is effective-dated

Change a CSAT target from 90% to 92% today, and last quarter's *"six consecutive weeks above target"* silently becomes false. Targets carry `valid_from` / `valid_to`; a fact is always judged against the target in force on its period start date. Saving a new target **closes** the one it replaces rather than overwriting it.

---

## Directory

```
apps-script/
├── appsscript.json         Manifest
│
├── Constants.gs            Enumerations, platform limits, tunable defaults
├── Schema.gs               ⭐ Every table's shape — the single source of truth
├── Utils.gs                Pure helpers (dates, numbers, formatting)
├── Infra.gs                Logging, caching, locking, time budgeting
├── Repository.gs           ⭐ The ONLY module that touches SpreadsheetApp
├── Auth.gs                 Identity, roles, capabilities
├── Bootstrap.gs            First-run setup, additive migrations, triggers
│
├── MetricStrategy.gs       ⭐ The data-type dispatch table
├── ConfigService.gs        LOB / metric / target CRUD + target resolution
├── PeriodEngine.gs         Periods, ordering, "what came before this?"
├── Validation.gs           Blocking validation + non-blocking quality flags
├── Facts.gs                Idempotent writes, filtered reads
├── Aggregation.gs          ⭐ Rollups, population statistics, ranking
├── DeltaEngine.gs          Typed deltas, trends, streaks, rolling averages
├── MaterializedViews.gs    Pre-aggregation — why it stays fast on Sheets
├── Dashboard.gs            Read models for every screen
├── InsightEngine.gs        Plain-language observations
├── ChartConfig.gs          Saved charts + render payloads
├── Api.gs                  Single entry point, one dispatch table
├── Main.gs                 doGet, menu, standalone installer
├── Tests.gs                Run runAllTests() in the editor
│
├── Index.html              The served page
├── Styles.html             Design system
├── Components.html         API client, UI primitives, formatting
├── Charts.html             Inline SVG renderer — no library, no CDN
├── Views.html              Dashboard, LOB, metric, data entry
├── ViewsConfig.html        Configuration centre
├── Scripts.html            State, router, filters, boot
│
├── test-harness/
│   ├── run.sh              Run the server code under Node — no deploy needed
│   ├── shim.js             Google service stubs
│   ├── sheets-shim.js      In-memory SpreadsheetApp
│   └── e2e.js              Full API walkthrough
│
└── docs/
    ├── ARCHITECTURE.md     Layers, engines, design decisions
    ├── DATA-MODEL.md       Every table and column, with rationale
    ├── DEPLOYMENT.md       Install, deploy, operate, versioning
    └── ROADMAP.md          Phases 5-10, including the statistics engine
```

---

## Deployment in three minutes

1. Create a Google Sheet → **Extensions → Apps Script**.
2. Create each file above with a matching name (`.gs` files as *Script*, `.html` as *HTML*). Or use [clasp](https://github.com/google/clasp): `clasp push`.
3. Reload the sheet → **OPP → Run first-time setup**.
4. **Deploy → New deployment → Web app** → execute as *me*, access as appropriate.
5. Open the web app URL.

Full instructions, including the standalone (non-sheet-bound) variant and the access model: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

On first open the app shows a setup checklist rather than an empty dashboard full of zeroes. **Load a starter configuration** creates two example LOBs, four metrics covering different data types, thirteen weekly periods and three targets — and deliberately **no performance data**, because invented numbers in a real deployment are worse than an empty screen.

---

## Capacity, honestly

Sheets is the right store at this scale and stops being so at a knowable point. Both facts are surfaced on the admin health panel, not buried here.

| Scenario | Rows/year | Verdict |
|---|---|---|
| 200 agents × 10 metrics × 52 weeks, 1 LOB | ~104,000 | Comfortable |
| Same × 6 LOBs | ~624,000 | Needs year partitioning; migrate within ~12 months |
| **Daily** agent-level metrics | millions | Not viable in Sheets |

**How the design absorbs it:**

- Dashboards read `agg_*` (materialised rollups), **never** fact rows. A 200-agent LOB across 52 weeks is ~52 rollup rows instead of ~104,000 facts.
- Fact tables partition by year (`fact_metric_value_2026`).
- Submissions trigger *incremental* materialisation — only the affected slices.
- The nightly full rebuild is chunked and resumable, so hitting the 6-minute ceiling checkpoints a cursor instead of losing the work.
- A per-execution read cache stops one submission reading the same partition three times.

**Migration SLOs** (`MIGRATION_SLO` in `Constants.gs`, shown live in Configuration → System):

| Trip wire | Threshold |
|---|---|
| Live fact rows | 250,000 |
| Dashboard p95 | 3s |
| Nightly rebuild | 20 min |
| Concurrent editors | 20 |
| Daily agent-level metrics enabled | any |

`Repository.gs` is an interface, not a set of scattered `SpreadsheetApp` calls. When a trip wire fires, that one module is reimplemented against BigQuery or Postgres and **every engine, calculation and screen keeps working unchanged**.

---

## Roles

| Role | Config | Entry | Analytics | Admin |
|---|---|---|---|---|
| `ADMIN` | ✅ | ✅ | ✅ | ✅ |
| `MANAGER` | — | ✅ | ✅ | — |
| `ANALYST` | — | ✅ | ✅ | — |
| `VIEWER` | — | — | ✅ | — |

Managers are recognised automatically by the email on their `dim_manager` record. Admins are listed in the `admin_emails` setting; on a fresh install the deploying user is admin.

> **Sheets has no row-level access control.** This model authorises *features*, not *rows* — anyone who can open the underlying spreadsheet reads everything in it. Where the data is sensitive, do not share the spreadsheet; deploy the web app as "execute as me" so only the app account touches the sheet.

---

## Testing

**In Apps Script:** open the editor and run `runAllTests()`. Results print to the log.

**Locally, without deploying:**

```bash
cd apps-script/test-harness
./run.sh            # syntax + unit + end-to-end
./run.sh unit       # Tests.gs only
./run.sh e2e        # full API walkthrough
```

Apps Script has no local runner, which normally means the only way to find out whether a calculation is right is to deploy it and look. The harness stubs the handful of Google services the server touches — including an in-memory Sheets implementation — and runs the real modules, unmodified, under Node.

The end-to-end pass exercises the actual API surface: setup → LOBs → metrics → generated periods → layered targets → agents → 16 agent submissions → resubmission → rollups → dashboards → charts → full rebuild. It asserts the things that matter, including that a 200-survey agent and a 4-survey agent roll up to the **weighted** 93.50% and not the unweighted 92.00%, that the 4-survey agent is excluded from ranking despite scoring 100%, that an LOB target overrides a global one, that a resubmission supersedes rather than duplicates, and that a full rebuild reproduces the incremental result exactly.

Current state: **26 files syntax-clean · 47/47 unit · all end-to-end checks passing.**

Unit coverage is deliberately concentrated on the calculations that fail *silently* — the ones that produce a plausible number rather than an error:

- weighted vs unweighted aggregation (the 95% vs 90.4% case)
- direction of success across all three modes
- delta units (pp vs seconds vs absolute)
- status resolution for higher/lower/target-based
- ranking order and small-sample exclusion
- period ordering by date rather than label (`Week 4` before `Week 31`)
- idempotency key stability

---

## What is not built yet

Phases 0–4 are complete and deployable. The following are designed for — with the seams already in place — and arrive in later phases:

- Agent-level analytics, pivot views and heat maps
- Cross-sectional outlier detection (IQR, robust Z, funnel plots)
- Control charts with the correct chart family per data type, plus Nelson rules
- The Lean Six Sigma insight engine (common vs special cause)
- Manager scorecards

See [docs/ROADMAP.md](docs/ROADMAP.md) — including why plain Z-scores are *not* the default and why cross-sectional and longitudinal outliers are treated as two different analyses.
