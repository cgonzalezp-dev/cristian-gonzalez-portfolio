/**
 * Dashboard.gs
 * -----------------------------------------------------------------------------
 * Read models for the dashboard screens.
 *
 * Everything here reads agg_* (materialised), never fact rows. That is what
 * keeps a 200-agent, multi-LOB, multi-year deployment responsive on Sheets.
 *
 * Every number returned carries its provenance — how it was aggregated, how
 * many contributors and observations sit behind it, and whether it cleared the
 * sample gate. The Phase 1 analysis of the source material found six arithmetic
 * errors that all traced back to numbers presented without their denominator;
 * the read models make that shape of error structurally hard to repeat.
 */

const Dashboard = (function () {

  /**
   * A metric's time series for one subject, with every derived comparison.
   * The single most reused read model in the app.
   */
  function metricSeries(params) {
    const metric = ConfigService.getMetric(params.metric_id);
    const periodType = params.period_type || metric.default_frequency || PERIOD_TYPE.WEEKLY;
    const count = num(params.period_count) || 12;

    const periods = PeriodEngine.latest(periodType, count, params.calendar_id);
    if (!periods.length) {
      return { metric: metric, periods: [], series: [], empty: true };
    }
    const periodIds = periods.map(function (p) { return p.period_id; });

    const rows = MaterializedViews.withPeriodLabels(MaterializedViews.read({
      subject_type: params.subject_type || SUBJECT_TYPE.GLOBAL,
      subject_id: params.subject_id || '',
      metric_id: metric.metric_id,
      period_ids: periodIds
    }));

    // Densify: a period with no data must appear as a gap, not be silently
    // dropped — otherwise a missing week looks like continuity in a trend line.
    const byPeriod = {};
    rows.forEach(function (r) { byPeriod[r.period_id] = r; });

    const series = periods.map(function (p) {
      const r = byPeriod[p.period_id];
      return {
        period_id: p.period_id,
        period_label: p.period_label,
        period_start: p.start_date,
        period_end: p.end_date,
        value: r ? r.value : null,
        numerator: r ? r.numerator_sum : null,
        denominator: r ? r.denominator_sum : null,
        target: r ? r.target : null,
        status: r ? r.status : STATUS.INSUFFICIENT_DATA,
        is_weighted: r ? r.is_weighted : false,
        aggregation_rule: r ? r.aggregation_rule : '',
        contributor_count: r ? r.contributor_count : 0,
        observation_count: r ? r.observation_count : 0,
        display: r ? formatValue(r.value, metric.unit, metric.decimal_places) : '—',
        missing: !r
      };
    });

    const withValues = series.filter(function (s) { return s.value != null; });
    const current = withValues.length ? withValues[withValues.length - 1] : null;

    return {
      metric: publicMetric(metric),
      series: series,
      rolling: DeltaEngine.rollingAverages(series, ConfigService.getSetting('rolling_window')),
      current: current,
      vs_prior: DeltaEngine.periodOverPeriod(withValues, metric),
      vs_target: current
        ? DeltaEngine.versusTarget(current.value, current.target, metric, current.denominator)
        : null,
      vs_rolling: DeltaEngine.versusRollingAverage(withValues, metric),
      trend: DeltaEngine.classifyTrend(withValues, metric),
      streak: DeltaEngine.streak(withValues, metric),
      extremes: DeltaEngine.extremes(withValues, metric),
      empty: !withValues.length
    };
  }

  /**
   * Compare several subjects on one metric for one period.
   * Powers multi-LOB comparison, manager league tables and the agent matrix.
   */
  function compareSubjects(params) {
    const metric = ConfigService.getMetric(params.metric_id);
    const period = params.period_id
      ? PeriodEngine.get(params.period_id)
      : latestPeriodWithData(metric.metric_id,
          params.period_type || metric.default_frequency);
    if (!period) return { metric: publicMetric(metric), rows: [], empty: true };

    const rows = MaterializedViews.read({
      subject_type: params.subject_type || SUBJECT_TYPE.LOB,
      subject_ids: params.subject_ids,
      metric_id: metric.metric_id,
      period_ids: [period.period_id]
    });

    const priorPeriod = PeriodEngine.previous(period);
    const priorRows = priorPeriod ? MaterializedViews.read({
      subject_type: params.subject_type || SUBJECT_TYPE.LOB,
      metric_id: metric.metric_id,
      period_ids: [priorPeriod.period_id]
    }) : [];
    const priorBySubject = {};
    priorRows.forEach(function (r) { priorBySubject[r.subject_id] = r; });

    const names = subjectNameMap(params.subject_type || SUBJECT_TYPE.LOB);

    const enriched = rows.map(function (r) {
      const prior = priorBySubject[r.subject_id];
      return {
        subject_type: r.subject_type,
        subject_id: r.subject_id,
        subject_name: names[r.subject_id] || r.subject_id,
        value: r.value,
        display: formatValue(r.value, metric.unit, metric.decimal_places),
        numerator: r.numerator_sum,
        denominator: r.denominator_sum,
        observation_count: r.observation_count,
        contributor_count: r.contributor_count,
        is_weighted: r.is_weighted,
        target: r.target,
        status: r.status,
        attainment: Aggregation.attainment(r.value, r.target, metric),
        delta: DeltaEngine.build(metric, prior ? prior.value : null, r.value,
          COMPARISON.VS_PRIOR_PERIOD, {
            n_from: prior ? prior.observation_count : null,
            n_to: r.observation_count,
            label_from: priorPeriod ? priorPeriod.period_label : '',
            label_to: period.period_label,
            target: r.target
          })
      };
    });

    const ranking = Aggregation.rank(enriched, metric);
    const stats = Aggregation.populationStats(enriched.map(function (e) {
      return { value: e.value, numerator: e.numerator, denominator: e.denominator };
    }), metric);

    return {
      metric: publicMetric(metric),
      period: { period_id: period.period_id, period_label: period.period_label,
                start_date: period.start_date, end_date: period.end_date },
      compare_period: priorPeriod
        ? { period_id: priorPeriod.period_id, period_label: priorPeriod.period_label }
        : null,
      rows: ranking.ranked,
      excluded: ranking.excluded,
      stats: stats,
      best: ranking.ranked[0] || null,
      worst: ranking.ranked.length ? ranking.ranked[ranking.ranked.length - 1] : null,
      empty: !enriched.length
    };
  }

  /**
   * LOB scorecard: every metric assigned to one LOB, for one period.
   */
  function lobScorecard(params) {
    const lobId = str(params.lob_id);
    const lob = Repository.findById(TABLE.LOB, lobId);
    if (!lob) throw new AppError('NOT_FOUND', 'Line of business not found.');

    const periodType = params.period_type || PERIOD_TYPE.WEEKLY;
    const metrics = ConfigService.metricsForLob(lobId, false);

    const cards = metrics.map(function (metric) {
      const s = metricSeries({
        metric_id: metric.metric_id,
        subject_type: SUBJECT_TYPE.LOB,
        subject_id: lobId,
        period_type: periodType,
        period_count: num(params.period_count) || 12
      });
      return {
        metric: s.metric,
        current: s.current,
        vs_prior: s.vs_prior,
        vs_target: s.vs_target,
        trend: s.trend,
        streak: s.streak,
        sparkline: s.series.map(function (p) { return p.value; }),
        labels: s.series.map(function (p) { return p.period_label; }),
        empty: s.empty
      };
    });

    return {
      lob: { lob_id: lob.lob_id, lob_name: lob.lob_name, description: lob.description },
      period_type: periodType,
      cards: cards,
      summary: summarise(cards)
    };
  }

  /**
   * Executive roll-up. Counts are computed from the same read models the detail
   * screens use, so a tile can never disagree with the page it links to.
   */
  function executiveSummary(params) {
    const periodType = params.period_type || PERIOD_TYPE.WEEKLY;
    const lobs = ConfigService.listLobs(false);
    const metrics = ConfigService.listMetrics(false);

    const cards = [];
    lobs.forEach(function (lob) {
      ConfigService.metricsForLob(lob.lob_id, false).forEach(function (metric) {
        const s = metricSeries({
          metric_id: metric.metric_id,
          subject_type: SUBJECT_TYPE.LOB,
          subject_id: lob.lob_id,
          period_type: periodType,
          period_count: num(params.period_count) || 8
        });
        if (s.empty) return;
        cards.push({
          lob_id: lob.lob_id, lob_name: lob.lob_name,
          metric: s.metric, current: s.current,
          vs_prior: s.vs_prior, vs_target: s.vs_target,
          trend: s.trend, streak: s.streak
        });
      });
    });

    const onTarget = cards.filter(function (c) {
      return c.current && c.current.status === STATUS.ON_TARGET;
    });
    const offTarget = cards.filter(function (c) {
      return c.current && (c.current.status === STATUS.BELOW_TARGET ||
                           c.current.status === STATUS.ABOVE_TARGET);
    });
    const atRisk = cards.filter(function (c) {
      return c.current && c.current.status === STATUS.AT_RISK;
    });

    // Biggest movers, ranked by direction-aware magnitude so a falling AHT can
    // legitimately be the biggest improvement of the week.
    const movers = cards.filter(function (c) {
      return c.vs_prior && c.vs_prior.absolute_change != null && c.vs_prior.reliable;
    });
    const improvements = movers
      .filter(function (c) { return c.vs_prior.interpretation === INTERPRETATION.IMPROVED; })
      .sort(function (a, b) {
        return Math.abs(b.vs_prior.absolute_change) - Math.abs(a.vs_prior.absolute_change);
      });
    const declines = movers
      .filter(function (c) { return c.vs_prior.interpretation === INTERPRETATION.DECLINED; })
      .sort(function (a, b) {
        return Math.abs(b.vs_prior.absolute_change) - Math.abs(a.vs_prior.absolute_change);
      });

    return {
      period_type: periodType,
      counts: {
        lobs: lobs.length,
        metrics: metrics.length,
        tracked: cards.length,
        on_target: onTarget.length,
        off_target: offTarget.length,
        at_risk: atRisk.length,
        no_target: cards.filter(function (c) {
          return c.current && c.current.status === STATUS.NO_TARGET;
        }).length
      },
      attainment_rate: cards.length ? round(onTarget.length / cards.length * 100, 1) : null,
      best_lob: bestLob(cards),
      biggest_improvement: improvements[0] || null,
      biggest_decline: declines[0] || null,
      alerts: declines.slice(0, 6),
      cards: cards,
      insights: InsightEngine.forExecutive(cards)
    };
  }

  /**
   * Which LOB is performing best overall. Deliberately expressed as "share of
   * its metrics on target" rather than an average of unlike numbers — you
   * cannot average a percentage, a duration and a count into a score.
   */
  function bestLob(cards) {
    const byLob = groupBy(cards, function (c) { return c.lob_id; });
    let best = null;
    Object.keys(byLob).forEach(function (lobId) {
      const group = byLob[lobId];
      const scored = group.filter(function (c) {
        return c.current && c.current.status !== STATUS.NO_TARGET;
      });
      if (!scored.length) return;
      const hit = scored.filter(function (c) {
        return c.current.status === STATUS.ON_TARGET;
      }).length;
      const rate = hit / scored.length;
      if (!best || rate > best.rate) {
        best = {
          lob_id: lobId, lob_name: group[0].lob_name,
          rate: rate, on_target: hit, measured: scored.length
        };
      }
    });
    return best;
  }

  function summarise(cards) {
    const measured = cards.filter(function (c) { return c.current; });
    return {
      total: cards.length,
      measured: measured.length,
      on_target: measured.filter(function (c) {
        return c.current.status === STATUS.ON_TARGET;
      }).length,
      improving: measured.filter(function (c) {
        return c.vs_prior && c.vs_prior.interpretation === INTERPRETATION.IMPROVED;
      }).length,
      declining: measured.filter(function (c) {
        return c.vs_prior && c.vs_prior.interpretation === INTERPRETATION.DECLINED;
      }).length,
      stable: measured.filter(function (c) {
        return c.vs_prior && c.vs_prior.interpretation === INTERPRETATION.STABLE;
      }).length
    };
  }

  function latestPeriodWithData(metricId, periodType) {
    const rows = MaterializedViews.read({ metric_id: metricId, period_type: periodType });
    if (!rows.length) return null;
    return PeriodEngine.get(rows[rows.length - 1].period_id);
  }

  /** id -> display name, for whichever dimension a subject type points at. */
  function subjectNameMap(subjectType) {
    const map = {};
    const spec = {
      [SUBJECT_TYPE.AGENT]:   [TABLE.AGENT, 'agent_id', 'agent_name'],
      [SUBJECT_TYPE.TEAM]:    [TABLE.TEAM, 'team_id', 'team_name'],
      [SUBJECT_TYPE.MANAGER]: [TABLE.MANAGER, 'manager_id', 'manager_name'],
      [SUBJECT_TYPE.REGION]:  [TABLE.REGION, 'region_id', 'region_name'],
      [SUBJECT_TYPE.LOB]:     [TABLE.LOB, 'lob_id', 'lob_name'],
      [SUBJECT_TYPE.COHORT]:  [TABLE.COHORT, 'cohort_id', 'cohort_name']
    }[subjectType];
    if (!spec) return map;
    Repository.readAll(spec[0]).forEach(function (r) { map[r[spec[1]]] = r[spec[2]]; });
    return map;
  }

  /** Trim a metric config down to what the client needs to render it. */
  function publicMetric(m) {
    return {
      metric_id: m.metric_id,
      metric_name: m.metric_name,
      display_name: m.display_name || m.metric_name,
      definition: m.definition,
      data_type: m.data_type,
      unit: m.unit,
      decimal_places: m.decimal_places,
      direction_of_success: m.direction_of_success,
      aggregation_rule: m.aggregation_rule,
      instrument: m.instrument,
      category: m.category,
      requires_denominator: m.requires_denominator,
      numerator_label: m.numerator_label,
      denominator_label: m.denominator_label
    };
  }

  return {
    metricSeries: metricSeries,
    compareSubjects: compareSubjects,
    lobScorecard: lobScorecard,
    executiveSummary: executiveSummary,
    subjectNameMap: subjectNameMap,
    publicMetric: publicMetric
  };
})();
