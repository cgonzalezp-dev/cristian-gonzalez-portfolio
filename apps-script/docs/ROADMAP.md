# Roadmap

Phases 0–4 are built and deployable. What follows is designed for — the seams exist in the current schema and engines — and is scheduled, not speculative.

| Phase | Contents | Status |
|---|---|---|
| 0 | Repository, cache, lock, logging, auth, schema, migrations | ✅ Built |
| 1 | Config: LOB · metric · period · target (effective-dated) + Configuration UI | ✅ Built |
| 2 | Data entry (dynamic form + bulk grid), validation, quality flags | ✅ Built |
| 3 | Aggregation + typed delta engines, materialised views | ✅ Built |
| 4 | Charts + chart config + LOB/metric dashboards + insights | ✅ Built |
| 5 | Agent performance views and profiles | Designed |
| 6 | Cross-sectional outlier engine | Designed |
| 7 | Control charts + Nelson rules + LSS insight engine | Designed |
| 8 | Pivot engine | Designed |
| 9 | Executive dashboard v2, manager scorecards | Designed |
| 10 | Survey / Voice-of-Customer module | Scoped |

---

## Phase 5 — Agent performance

`dim_agent` and `subject_type = AGENT` already exist and already work; entry, aggregation and rollup treat an agent like any other subject today. This phase adds the screens:

- Agent performance matrix (agent × period, dynamic columns)
- Agent profile: history, rolling average, percentile, streaks, best/worst period, comments
- Manager and team scorecards
- Biggest improvements / declines / most consistent / most volatile — all ranked through `MetricStrategy.comparator`, so a falling AHT can legitimately be the biggest improvement of the week

---

## Phase 6 — Cross-sectional outliers

**The question:** is this agent unusual *compared to peers* this period?

### Why Z-score is not the default

Z-score assumes roughly normal, unbounded data. CSAT, Quality and Service Level cluster near a ceiling and are left-skewed. Worse, at n≈40 a single low agent inflates the standard deviation enough to **hide itself**.

Defaults, all configurable:

| Method | When |
|---|---|
| **IQR** (default) | Distribution-free, robust to the outlier it is trying to find |
| **Robust Z** (median / MAD) | When a Z-like score is wanted without mean-and-SD contamination |
| **Funnel plot** | ⭐ Proportion metrics with varying nᵢ — limits widen for subjects with fewer observations |
| **Plain Z** | Available, but never the default |

The funnel plot is the statistically correct way to compare subjects with different sample sizes, and it structurally prevents *"Agent B is a star (n=4)"*. It needs the denominator — which is why denominator capture is mandatory.

### Multiple comparisons

Screening 40 agents at Z≥2 produces **≈2 false positives per metric per week** by construction. Ten metrics ⇒ ~20 agents flagged weekly who are simply normal. Managers learn to ignore the Outliers tab within a month.

Mitigations, all shipping with the engine:

- Report expected-false-positive count beside the flag count: *"7 flagged — about 2 expected by chance"*
- Configurable stricter threshold, or FDR control
- **Persistence requirement**: flagged in ≥2 of the last 3 periods before an agent enters the *action* list. Single-period flags go to a lower-priority watch tier. (`persistence_periods_required` / `persistence_window` are already seeded in settings.)

---

## Phase 7 — Control charts and the LSS engine

**The question:** has this agent's own process shifted?

Phases 6 and 7 answer different questions and must not be conflated. An agent can be a peer outlier every week and be perfectly stable — that is their normal level, not a special cause. An agent can sit mid-pack and be in free fall. Two engines, two UI surfaces, cross-linked.

### Chart selection is derived, never chosen by hand

| Data shape | Chart | Limits |
|---|---|---|
| Proportion, **denominator varies** | **p-chart** | `p̄ ± 3√(p̄(1−p̄)/nᵢ)` — limits vary per point |
| Proportion, denominator ~constant | np-chart | `np̄ ± 3√(np̄(1−p̄))` |
| Counts per period | c-chart | `c̄ ± 3√c̄` |
| Counts per varying exposure | u-chart | `ū ± 3√(ū/nᵢ)` |
| Continuous, one value per period | **I-MR** | `x̄ ± 2.66 × M̄R` |
| Continuous, subgroups 2–9 | X̄-R | `x̄̄ ± A₂R̄` |
| Continuous, subgroups ≥10 | X̄-S | `x̄̄ ± A₃S̄` |

`MetricStrategy` already declares a `controlChart` family per data type.

**Two mistakes this specifically prevents:**

1. **±3 × the standard deviation of the raw series is not a control limit.** If the process shifted mid-series, the raw SD absorbs the shift and the limits widen to hide it. Individuals charts use the *average moving range* (`2.66 × M̄R`) precisely because MR captures only short-term, point-to-point variation. This is the most common way LSS gets done wrong in operations dashboards.
2. **A p-chart with constant limits penalises low-volume subjects.** An agent with 8 surveys genuinely varies more than one with 200. Variable limits handle that; a fixed ±3σ flags them every other week.

### Special-cause detection: Nelson rules, not just "outside the limits"

| Rule | Pattern | Reading |
|---|---|---|
| 1 | 1 point beyond 3σ | Special cause — investigate that period |
| 2 | 9 consecutive one side of centre | **Sustained shift**, not a single anomaly |
| 3 | 6 consecutive rising or falling | Trend |
| 5 | 2 of 3 beyond 2σ, same side | Early warning |
| 6 | 4 of 5 beyond 1σ, same side | Small sustained shift |
| 7 | 15 consecutive within 1σ | **Over-control, or a measurement problem** |

Rule 7 is how the system detects a data-quality issue statistically rather than by guessing. Real performance is never that smooth; a flat line usually means someone is copying last week's number.

Rules 1/2/3/5 default on; the rest are configurable.

### Vocabulary discipline

| Term | Meaning here | Set by |
|---|---|---|
| **Target** | Desired performance | A business decision |
| **Specification limit** | Contractual / SLA boundary | A business decision |
| **Control limit** | What the process *actually does* | Computed — **never** set by a human |
| **Common-cause variation** | Inside limits, no rule violation | "Normal. Changing one agent won't fix it." |
| **Special-cause variation** | Rule violation | "Something specific happened. Worth investigating." |

Enforced visually — target dashed amber, spec limits a shaded band, control limits solid grey, always with a legend. **The word "defect" is never applied to a person.** Classifications are `Within expected range` / `Above expected range` / `Below expected range` / `Insufficient data` / `Requires validation`.

**Process capability (Cp/Cpk) is deliberately excluded.** It requires a stable process, spec limits, and approximately normal data. Applied to a bounded, ceiling-clustered percentage like CSAT it produces authoritative-looking nonsense. If added later it will be gated behind a normality check and a stability check, and will explain *why* it is unavailable when it is.

### No claimed root causes

The engine outputs *"Agent A shows a sustained downward shift (Nelson Rule 2, 9 periods) — worth investigating"*, never *"Agent A declined because of X"*. Correlations may be offered as hypotheses with an explicit not-causal label.

### Governance

Agent-level flagging is framed as **coaching signal, not performance rating**:

- Language is "where to investigate", never "underperformers"
- Persistence required before an agent enters the action list
- Every flag shows its own `n` and confidence inline
- Audit log records who viewed and who dismissed flags
- A visible statement that outlier status is not a performance judgment

Cheap to build in now; near-impossible to retrofit once the tool is in managers' hands.

---

## Phase 8 — Pivot engine

Server filters and aggregates to long format; the client pivots and renders, so re-pivoting costs no round trip.

Guardrails:
- **Cell cap ~15,000.** Beyond it the server returns the top-N by the chosen sort with an explicit *"showing 200 of 1,340"* — never a silent truncation.
- **The aggregation picker is constrained by data type.** `SUM` on a percentage is not offered.
- **Mixed-metric pivots never total a row.** CSAT% + AHT seconds has no sum. Totals appear only when units are homogeneous.
- Columns generated from selected periods, ordered by `sort_key` — so `Week 4` precedes `Week 31` and `August W1` lands where its dates say.

Saveable named views.

---

## Phase 9 — Executive dashboard v2

Configurable widget layout, per-role dashboards, alert digests, scheduled email summaries, and export.

---

## Phase 10 — Survey / Voice of Customer

Deliberately **not** forced into the metric fact table. Survey data has a different shape:

- Every question carries its own denominator — a 76-respondent study routinely has denominators of 76, 74, 73, 72, 68 and 48 across its questions, plus multi-select questions where mentions exceed respondents
- Responses are categorical and coded, not numeric
- Waves have versioned question banks, so wave-over-wave comparison is a join on question identity, not on a metric id

It becomes a sibling module sharing config, periods and the insight engine. Forcing it into `fact_metric_value` would produce exactly the denominator confusion the platform exists to prevent.

---

## Beyond Sheets

When a migration SLO trips (250k live fact rows, 3s dashboard p95, 20-minute rebuild, 20 concurrent editors, or daily agent-level metrics), the fact store moves to BigQuery or Postgres.

**What changes:** `Repository.gs`.
**What does not:** every engine, every calculation, every screen, and the schema itself.

Sheets is retained for configuration and manual entry, which is genuinely where it excels.
