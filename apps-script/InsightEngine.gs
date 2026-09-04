/**
 * InsightEngine.gs
 * -----------------------------------------------------------------------------
 * Plain-language observations generated from computed comparisons.
 *
 * Scope of THIS phase: deterministic, arithmetic insights only — movement,
 * target attainment, streaks, leaders and laggards. The Lean Six Sigma insight
 * engine (common vs special cause, dispersion shifts, control-limit violations)
 * arrives with the statistics phase and plugs in through the same interface.
 *
 * Three rules every generated sentence obeys:
 *
 *   1. DIRECTION-AWARE. Nothing is called an improvement without asking
 *      MetricStrategy first. A falling AHT improved; a falling CSAT did not.
 *
 *   2. UNITS ARE HONEST. Percentages move in percentage points, durations in
 *      seconds. "CSAT rose 5%" and "CSAT rose 5pp" are different claims and
 *      only one of them is what happened.
 *
 *   3. NO CAUSATION. The engine reports what changed and where to look. It
 *      never asserts why, because the data here cannot support that.
 */

const InsightEngine = (function () {

  const SEVERITY = { CRITICAL: 'CRITICAL', WARNING: 'WARNING', POSITIVE: 'POSITIVE',
                     NEUTRAL: 'NEUTRAL' };

  function insight(severity, text, context) {
    return { severity: severity, text: text, context: context || null };
  }

  /**
   * Insights for a single metric series.
   * @param {!Object} s output of Dashboard.metricSeries
   * @return {!Array<!Object>}
   */
  function forSeries(s) {
    const out = [];
    if (!s || s.empty || !s.current) return out;

    const metric = s.metric;
    const name = metric.display_name || metric.metric_name;

    // --- movement against the previous period ----------------------------
    if (s.vs_prior && s.vs_prior.interpretation !== INTERPRETATION.INSUFFICIENT_DATA) {
      const d = s.vs_prior;
      if (d.interpretation === INTERPRETATION.STABLE) {
        out.push(insight(SEVERITY.NEUTRAL,
          name + ' held steady at ' +
          formatValue(d.value_to, metric.unit, metric.decimal_places) +
          (d.label_from ? ' versus ' + d.label_from : '') + '.'));
      } else {
        const positive = d.interpretation === INTERPRETATION.IMPROVED;
        out.push(insight(positive ? SEVERITY.POSITIVE : SEVERITY.WARNING,
          name + ' ' + d.direction_label + ' ' + stripSign(d.display) +
          (d.label_from ? ' versus ' + d.label_from : '') + '.' +
          (d.reliable ? '' : ' Sample size below threshold — treat with caution.')));
      }
    }

    // --- distance from target --------------------------------------------
    if (s.vs_target && s.vs_target.absolute_change != null) {
      const t = s.vs_target;
      if (t.status === STATUS.ON_TARGET) {
        out.push(insight(SEVERITY.POSITIVE,
          name + ' is on target at ' +
          formatValue(t.value_to, metric.unit, metric.decimal_places) + '.'));
      } else {
        const gap = MetricStrategy.formatDelta(metric, Math.abs(t.absolute_change));
        out.push(insight(
          t.status === STATUS.AT_RISK ? SEVERITY.WARNING : SEVERITY.CRITICAL,
          name + ' is ' + stripSign(gap) + ' ' +
          (t.direction_label === 'above target' ? 'above' : 'below') + ' target (' +
          formatValue(t.value_from, metric.unit, metric.decimal_places) + ').'));
      }
    }

    // --- streaks ----------------------------------------------------------
    if (s.streak && s.streak.length >= 2) {
      const st = s.streak;
      if (st.direction === INTERPRETATION.IMPROVED) {
        out.push(insight(SEVERITY.POSITIVE,
          name + ' has improved for ' + st.length + ' consecutive periods.'));
      } else if (st.direction === INTERPRETATION.DECLINED) {
        out.push(insight(st.length >= 3 ? SEVERITY.CRITICAL : SEVERITY.WARNING,
          name + ' has declined for ' + st.length + ' consecutive periods.'));
      }
    }

    // --- sustained target performance ------------------------------------
    const onTargetRun = trailingRun(s.series, function (p) {
      return p.status === STATUS.ON_TARGET;
    });
    if (onTargetRun >= 4) {
      out.push(insight(SEVERITY.POSITIVE,
        name + ' has stayed on target for ' + onTargetRun + ' consecutive periods.'));
    }
    const offTargetRun = trailingRun(s.series, function (p) {
      return p.status === STATUS.BELOW_TARGET || p.status === STATUS.ABOVE_TARGET;
    });
    if (offTargetRun >= 3) {
      out.push(insight(SEVERITY.CRITICAL,
        name + ' has missed target for ' + offTargetRun +
        ' consecutive periods — this is a sustained gap, not a single bad period.'));
    }

    // --- movement over the whole window ----------------------------------
    const withValues = s.series.filter(function (p) { return p.value != null; });
    if (withValues.length >= 4 && s.trend &&
        s.trend.trend !== INTERPRETATION.INSUFFICIENT_DATA &&
        s.trend.trend !== INTERPRETATION.STABLE) {
      const first = withValues[0], last = withValues[withValues.length - 1];
      const overall = MetricStrategy.formatDelta(metric, last.value - first.value);
      const positive = s.trend.trend === INTERPRETATION.IMPROVED;
      out.push(insight(positive ? SEVERITY.POSITIVE : SEVERITY.WARNING,
        name + ' has ' + (positive ? 'improved' : 'declined') + ' ' + stripSign(overall) +
        ' across the last ' + withValues.length + ' periods (' +
        first.period_label + ' to ' + last.period_label + ').'));
    }

    // --- data coverage ----------------------------------------------------
    const missing = s.series.filter(function (p) { return p.missing; });
    if (missing.length) {
      out.push(insight(SEVERITY.WARNING,
        missing.length + ' of the last ' + s.series.length +
        ' periods have no data for ' + name + '. Trend reads across the gap.'));
    }

    // --- aggregation provenance ------------------------------------------
    if (s.current && s.current.is_weighted === false && s.current.contributor_count > 1) {
      out.push(insight(SEVERITY.NEUTRAL,
        name + ' was rolled up as an unweighted average because denominators are ' +
        'missing. Contributors with different sample sizes carry equal weight.'));
    }

    return out;
  }

  /** Insights across a comparison of subjects. */
  function forComparison(c) {
    const out = [];
    if (!c || c.empty || !c.rows.length) return out;
    const metric = c.metric;
    const name = metric.display_name || metric.metric_name;

    if (!c.stats.reliable) {
      out.push(insight(SEVERITY.NEUTRAL, c.stats.gate_message));
    }

    if (c.best) {
      out.push(insight(SEVERITY.POSITIVE,
        c.best.subject_name + ' leads on ' + name + ' at ' + c.best.display + '.'));
    }
    if (c.worst && c.rows.length > 1 && c.worst.subject_id !== c.best.subject_id) {
      out.push(insight(SEVERITY.WARNING,
        c.worst.subject_name + ' is lowest on ' + name + ' at ' + c.worst.display +
        ', ' + stripSign(MetricStrategy.formatDelta(metric,
          Math.abs(c.best.value - c.worst.value))) + ' behind the leader.'));
    }

    // Population value vs mean of subjects. When these diverge materially, the
    // difference is entirely down to unequal sample sizes — worth surfacing,
    // because the two are routinely mistaken for each other.
    if (c.stats.population_value != null && c.stats.mean != null) {
      const gap = Math.abs(c.stats.population_value - c.stats.mean);
      const material = metric.data_type === DATA_TYPE.PROPORTION ? 1 : 0;
      if (c.stats.is_weighted && gap > material) {
        out.push(insight(SEVERITY.NEUTRAL,
          'Overall ' + name + ' is ' +
          formatValue(c.stats.population_value, metric.unit, metric.decimal_places) +
          ', while the average across subjects is ' +
          formatValue(c.stats.mean, metric.unit, metric.decimal_places) +
          '. The gap reflects differing sample sizes; the overall figure is the ' +
          'one the business delivered.'));
      }
    }

    if (c.excluded && c.excluded.length) {
      out.push(insight(SEVERITY.NEUTRAL,
        c.excluded.length + ' subject' + (c.excluded.length === 1 ? '' : 's') +
        ' excluded from ranking for insufficient observations.'));
    }

    const improving = c.rows.filter(function (r) {
      return r.delta && r.delta.interpretation === INTERPRETATION.IMPROVED;
    }).length;
    const declining = c.rows.filter(function (r) {
      return r.delta && r.delta.interpretation === INTERPRETATION.DECLINED;
    }).length;
    const stable = c.rows.filter(function (r) {
      return r.delta && r.delta.interpretation === INTERPRETATION.STABLE;
    }).length;

    if (improving + declining + stable > 0) {
      out.push(insight(SEVERITY.NEUTRAL,
        improving + ' improved, ' + declining + ' declined and ' + stable +
        ' held steady on ' + name +
        (c.compare_period ? ' versus ' + c.compare_period.period_label : '') + '.'));
    }

    return out;
  }

  /** Executive-level insights across every tracked LOB/metric pair. */
  function forExecutive(cards) {
    const out = [];
    if (!cards || !cards.length) return out;

    const measured = cards.filter(function (c) {
      return c.current && c.current.status !== STATUS.NO_TARGET;
    });
    if (measured.length) {
      const onTarget = measured.filter(function (c) {
        return c.current.status === STATUS.ON_TARGET;
      }).length;
      out.push(insight(
        onTarget / measured.length >= 0.8 ? SEVERITY.POSITIVE : SEVERITY.WARNING,
        onTarget + ' of ' + measured.length + ' tracked metrics are on target (' +
        round(onTarget / measured.length * 100, 0) + '%).'));
    }

    const sustained = cards.filter(function (c) {
      return c.streak && c.streak.direction === INTERPRETATION.DECLINED &&
             c.streak.length >= 3;
    });
    sustained.forEach(function (c) {
      out.push(insight(SEVERITY.CRITICAL,
        (c.metric.display_name || c.metric.metric_name) + ' in ' + c.lob_name +
        ' has declined for ' + c.streak.length +
        ' consecutive periods — sustained, not a single-period movement.'));
    });

    const noTarget = cards.filter(function (c) {
      return c.current && c.current.status === STATUS.NO_TARGET;
    });
    if (noTarget.length) {
      out.push(insight(SEVERITY.NEUTRAL,
        noTarget.length + ' tracked metric' + (noTarget.length === 1 ? ' has' : 's have') +
        ' no target configured and cannot be scored.'));
    }

    return out.slice(0, 12);
  }

  /** Count how many trailing periods satisfy a predicate. */
  function trailingRun(series, predicate) {
    let run = 0;
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].value == null) break;
      if (!predicate(series[i])) break;
      run++;
    }
    return run;
  }

  /** Prose reads better without a leading sign: "improved 4.0pp", not "+4.0pp". */
  function stripSign(display) {
    return String(display).replace(/^\+/, '');
  }

  return {
    forSeries: forSeries,
    forComparison: forComparison,
    forExecutive: forExecutive,
    SEVERITY: SEVERITY
  };
})();
