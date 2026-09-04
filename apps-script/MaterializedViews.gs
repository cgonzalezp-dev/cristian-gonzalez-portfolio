/**
 * MaterializedViews.gs
 * -----------------------------------------------------------------------------
 * Pre-aggregation. The reason this platform stays fast on Sheets.
 *
 * At the approved scale — 200+ agents, ~10 metrics, weekly, several LOBs —
 * the fact table grows past 130,000 rows a year. Scanning that to paint a
 * dashboard would take seconds per widget and would breach the 6-minute
 * execution ceiling during a full page load.
 *
 * So dashboards NEVER read facts. They read agg_* tables, which hold one row
 * per (subject, metric, period). A 200-agent LOB across 52 weeks collapses from
 * ~104,000 fact rows to ~52 rollup rows.
 *
 * Two refresh paths:
 *   refreshSlice()  after every submission — recomputes only what changed.
 *                   Sub-second, runs inline with the write.
 *   rebuildAll()    nightly trigger — chunked and resumable, so a partial run
 *                   checkpoints its cursor instead of losing the work.
 */

const MaterializedViews = (function () {

  /**
   * Recompute every rollup affected by one fact write.
   * A single agent submission touches that agent, their team, their manager,
   * their region and their LOB — five slices, no more.
   */
  function refreshSlice(metricId, periodId, ctx) {
    const metric = ConfigService.getMetric(metricId);
    const period = PeriodEngine.get(periodId);

    const targets = [];
    if (ctx.agent_id)   targets.push([SUBJECT_TYPE.AGENT, ctx.agent_id]);
    if (ctx.team_id)    targets.push([SUBJECT_TYPE.TEAM, ctx.team_id]);
    if (ctx.manager_id) targets.push([SUBJECT_TYPE.MANAGER, ctx.manager_id]);
    if (ctx.region_id)  targets.push([SUBJECT_TYPE.REGION, ctx.region_id]);
    if (ctx.lob_id)     targets.push([SUBJECT_TYPE.LOB, ctx.lob_id]);
    targets.push([SUBJECT_TYPE.GLOBAL, '']);

    const facts = Facts.query({ metric_id: metricId, period_ids: [periodId] });
    const rows = targets.map(function (t) {
      return computeRollup(t[0], t[1], metric, period, facts);
    }).filter(Boolean);

    upsertAgg(rows);
    return rows.length;
  }

  /**
   * Build one agg row for a subject.
   *
   * Rollups are derived from AGENT-grain facts wherever they exist, because
   * that is the only grain that can be correctly re-aggregated. A directly
   * entered LOB-level value is kept as its own row rather than being merged —
   * so when both exist, the UI can show them side by side as a reconciliation
   * check instead of silently preferring one.
   */
  function computeRollup(subjectType, subjectId, metric, period, allFacts) {
    let contributing;

    if (subjectType === SUBJECT_TYPE.AGENT) {
      contributing = allFacts.filter(function (f) {
        return f.subject_type === SUBJECT_TYPE.AGENT && f.subject_id === subjectId;
      });
    } else {
      const field = {
        [SUBJECT_TYPE.TEAM]: 'team_id',
        [SUBJECT_TYPE.MANAGER]: 'manager_id',
        [SUBJECT_TYPE.REGION]: 'region_id',
        [SUBJECT_TYPE.LOB]: 'lob_id'
      }[subjectType];

      const fromAgents = allFacts.filter(function (f) {
        return f.subject_type === SUBJECT_TYPE.AGENT &&
               (!field || f[field] === subjectId);
      });
      const direct = allFacts.filter(function (f) {
        return f.subject_type === subjectType && f.subject_id === subjectId;
      });

      // Prefer the directly entered value when one exists: somebody asserted it
      // deliberately, and a rollup of a partial agent roster would understate it.
      contributing = direct.length ? direct : fromAgents;
    }

    if (!contributing.length) return null;

    const rolled = Aggregation.rollup(contributing, metric);
    const ctx = Facts.resolveSubjectContext(subjectType, subjectId);
    const target = ConfigService.resolveTarget(metric.metric_id, {
      agent_id: ctx.agent_id, manager_id: ctx.manager_id, team_id: ctx.team_id,
      region_id: ctx.region_id, lob_id: ctx.lob_id, period_type: period.period_type
    }, period.start_date);

    const targetValue = target ? target.target_value : null;

    return {
      agg_id: hashKey([subjectType, subjectId, metric.metric_id, period.period_id]),
      subject_type: subjectType,
      subject_id: subjectId,
      metric_id: metric.metric_id,
      period_id: period.period_id,
      period_type: period.period_type,
      period_start: period.start_date,
      numerator_sum: rolled.numerator_sum,
      denominator_sum: rolled.denominator_sum,
      value: rolled.value != null ? round(rolled.value, 6) : null,
      aggregation_rule: rolled.rule,
      is_weighted: rolled.is_weighted,
      contributor_count: rolled.contributor_count,
      observation_count: rolled.observation_count,
      target: targetValue,
      status: MetricStrategy.statusOf(metric, rolled.value, targetValue,
        target ? target.min_threshold : null, target ? target.max_threshold : null),
      computed_at: nowIso()
    };
  }

  /** Insert-or-replace agg rows, keyed on the deterministic agg_id. */
  function upsertAgg(rows) {
    if (!rows.length) return 0;
    const ids = {};
    rows.forEach(function (r) { ids[r.agg_id] = true; });
    Repository.deleteWhere(TABLE.AGG_SUBJECT, function (r) { return ids[r.agg_id]; });
    Repository.insertMany(TABLE.AGG_SUBJECT, rows);
    return rows.length;
  }

  /**
   * Full rebuild. Chunked by period so a run that hits the time budget saves a
   * cursor and resumes on the next invocation rather than starting over.
   * @param {string=} cursor period_id to resume from
   */
  function rebuildAll(cursor) {
    return recordJob('rebuildAll', function () {
      const budget = Budget();
      const metrics = ConfigService.listMetrics(true);
      const periods = PeriodEngine.all();

      let startIndex = 0;
      if (cursor) {
        for (let i = 0; i < periods.length; i++) {
          if (periods[i].period_id === cursor) { startIndex = i; break; }
        }
      }

      let processed = 0;
      const batch = [];

      for (let p = startIndex; p < periods.length; p++) {
        if (budget.exhausted()) {
          upsertAgg(batch);
          return { status: 'PARTIAL', rows: processed, cursor: periods[p].period_id,
                   message: 'Time budget reached; will resume from ' + periods[p].period_label };
        }
        const period = periods[p];
        const periodFacts = Facts.query({ period_ids: [period.period_id] });
        if (!periodFacts.length) continue;

        metrics.forEach(function (metric) {
          const metricFacts = periodFacts.filter(function (f) {
            return f.metric_id === metric.metric_id;
          });
          if (!metricFacts.length) return;

          subjectsIn(metricFacts).forEach(function (s) {
            const row = computeRollup(s.type, s.id, metric, period, metricFacts);
            if (row) { batch.push(row); processed++; }
          });
        });
      }

      // Full rebuild replaces wholesale — the table is derived by definition.
      Repository.replaceAll(TABLE.AGG_SUBJECT, batch);
      Cache.invalidate();
      return { status: 'SUCCESS', rows: processed, cursor: '' };
    });
  }

  /** Every distinct subject implied by a set of facts, at every grain. */
  function subjectsIn(facts) {
    const seen = {}, out = [];
    function add(type, id) {
      const k = type + '|' + id;
      if (!seen[k]) { seen[k] = true; out.push({ type: type, id: id }); }
    }
    facts.forEach(function (f) {
      add(f.subject_type, f.subject_id);
      if (f.team_id) add(SUBJECT_TYPE.TEAM, f.team_id);
      if (f.manager_id) add(SUBJECT_TYPE.MANAGER, f.manager_id);
      if (f.region_id) add(SUBJECT_TYPE.REGION, f.region_id);
      if (f.lob_id) add(SUBJECT_TYPE.LOB, f.lob_id);
    });
    add(SUBJECT_TYPE.GLOBAL, '');
    return out;
  }

  /**
   * Read rollups. This is the ONLY read path a dashboard should use.
   * @return {!Array<!Object>} sorted oldest-first
   */
  function read(filters) {
    const f = filters || {};
    const inList = function (value, list) {
      if (!list || (Array.isArray(list) && !list.length)) return true;
      const arr = Array.isArray(list) ? list : [list];
      return arr.indexOf(value) >= 0;
    };

    const rows = Repository.readAll(TABLE.AGG_SUBJECT).filter(function (r) {
      if (f.subject_type && r.subject_type !== f.subject_type) return false;
      if (!inList(r.subject_id, f.subject_id || f.subject_ids)) return false;
      if (!inList(r.metric_id, f.metric_id || f.metric_ids)) return false;
      if (f.period_type && r.period_type !== f.period_type) return false;
      if (!inList(r.period_id, f.period_ids)) return false;
      if (f.date_from && r.period_start < toDateStr(f.date_from)) return false;
      if (f.date_to && r.period_start > toDateStr(f.date_to)) return false;
      return true;
    });

    rows.sort(function (a, b) {
      return String(a.period_start).localeCompare(String(b.period_start));
    });
    return rows;
  }

  /** Attach period labels to rollup rows for display. */
  function withPeriodLabels(rows) {
    const byId = {};
    PeriodEngine.all().forEach(function (p) { byId[p.period_id] = p; });
    return rows.map(function (r) {
      const p = byId[r.period_id];
      r.period_label = p ? p.period_label : r.period_id;
      r.period_end = p ? p.end_date : '';
      return r;
    });
  }

  /** Nightly trigger entry point. Installed by Bootstrap.installTriggers(). */
  function nightlyRebuild() {
    const props = PropertiesService.getScriptProperties();
    const cursor = props.getProperty('rebuild_cursor') || '';
    const result = rebuildAll(cursor);
    props.setProperty('rebuild_cursor', result.cursor || '');
    return result;
  }

  return {
    refreshSlice: refreshSlice,
    rebuildAll: rebuildAll,
    nightlyRebuild: nightlyRebuild,
    read: read,
    withPeriodLabels: withPeriodLabels,
    computeRollup: computeRollup
  };
})();
