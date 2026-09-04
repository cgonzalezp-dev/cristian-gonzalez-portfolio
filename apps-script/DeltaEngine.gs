/**
 * DeltaEngine.gs
 * -----------------------------------------------------------------------------
 * Change over time, and change against a reference.
 *
 * Every delta this engine produces is TYPED. The Phase 1 analysis of the source
 * deck found a slide where "Δ +152 xbps" was in fact the gap between two
 * cohorts, not a movement over time — but it sat beside a plus sign and a trend
 * chart, so every reader took it for a trend. Three genuinely different
 * comparisons had one visual language.
 *
 * Here they cannot collide: comparison_type is mandatory, travels with the
 * number, and the UI renders each differently.
 *
 *   VS_PRIOR_PERIOD  movement over time         "+4.0pp vs Week 30"
 *   VS_TARGET        distance from a goal       "3.5pp below target"
 *   VS_COHORT        gap against another group  "+152bps vs All Riders"
 *   VS_ROLLING_AVG   movement against own norm  "+1.2pp vs 4-week average"
 */

const DeltaEngine = (function () {

  /**
   * Build a typed delta.
   *
   * @param {!Object} metric
   * @param {?number} from
   * @param {?number} to
   * @param {string} comparisonType
   * @param {!Object=} opts {target, n_from, n_to, label_from, label_to, stable_band}
   * @return {!Object}
   */
  function build(metric, from, to, comparisonType, opts) {
    const o = opts || {};
    const band = o.stable_band != null ? o.stable_band
                                       : ConfigService.getSetting('stable_band_pp');

    if (from == null || to == null) {
      return {
        comparison_type: comparisonType,
        value_from: from, value_to: to,
        absolute_change: null, percent_change: null, pp_change: null,
        interpretation: INTERPRETATION.INSUFFICIENT_DATA,
        display: '—', direction_label: '', reliable: false,
        n_from: o.n_from || null, n_to: o.n_to || null,
        label_from: o.label_from || '', label_to: o.label_to || ''
      };
    }

    const absolute = to - from;
    const percent = from !== 0 ? (absolute / Math.abs(from)) * 100 : null;
    // Percentage points only mean something for a percentage.
    const pp = metric.data_type === DATA_TYPE.PROPORTION ? absolute : null;

    const interpretation = MetricStrategy.interpret(
      metric, from, to, o.target, band);

    // Reliability: both sides must clear the observation gate, otherwise the
    // delta is shown but explicitly marked as not dependable.
    const minObs = metric.min_sample_observation ||
                   ConfigService.getSetting('min_sample_observation');
    const reliable = (o.n_from == null || o.n_from >= minObs) &&
                     (o.n_to == null || o.n_to >= minObs);

    return {
      comparison_type: comparisonType,
      value_from: round(from, 4),
      value_to: round(to, 4),
      absolute_change: round(absolute, 4),
      percent_change: percent != null ? round(percent, 2) : null,
      pp_change: pp != null ? round(pp, 2) : null,
      interpretation: interpretation,
      display: MetricStrategy.formatDelta(metric, absolute),
      direction_label: verb(interpretation, metric, comparisonType),
      reliable: reliable,
      n_from: o.n_from || null,
      n_to: o.n_to || null,
      label_from: o.label_from || '',
      label_to: o.label_to || ''
    };
  }

  /**
   * The verb used in generated prose. TARGET_BASED metrics never "improve" or
   * "decline" in the abstract — they move toward or away from their target.
   */
  function verb(interpretation, metric, comparisonType) {
    if (interpretation === INTERPRETATION.INSUFFICIENT_DATA) return 'no comparison available';
    if (interpretation === INTERPRETATION.STABLE) return 'held steady';
    if (metric.direction_of_success === DIRECTION.TARGET_BASED) {
      return interpretation === INTERPRETATION.IMPROVED
        ? 'moved toward target' : 'moved away from target';
    }
    if (comparisonType === COMPARISON.VS_COHORT) {
      return interpretation === INTERPRETATION.IMPROVED ? 'ahead of' : 'behind';
    }
    return interpretation === INTERPRETATION.IMPROVED ? 'improved' : 'declined';
  }

  /**
   * Period-over-period delta for a subject's series.
   * @param {!Array<!Object>} series oldest-first, one row per period
   * @return {!Object} delta for the most recent period
   */
  function periodOverPeriod(series, metric) {
    if (!series.length) {
      return build(metric, null, null, COMPARISON.VS_PRIOR_PERIOD, {});
    }
    const current = series[series.length - 1];
    const prior = series.length > 1 ? series[series.length - 2] : null;
    return build(metric, prior ? prior.value : null, current.value,
                 COMPARISON.VS_PRIOR_PERIOD, {
      n_from: prior ? prior.denominator : null,
      n_to: current.denominator,
      label_from: prior ? prior.period_label : '',
      label_to: current.period_label,
      target: current.target != null ? current.target : current.target_snapshot
    });
  }

  /** Distance from the resolved target. */
  function versusTarget(value, target, metric, n) {
    const d = build(metric, target, value, COMPARISON.VS_TARGET,
                    { target: target, n_to: n });
    if (d.absolute_change != null) {
      const status = MetricStrategy.statusOf(metric, value, target, null, null);
      d.status = status;
      d.direction_label = status === STATUS.ON_TARGET ? 'on target'
        : (d.absolute_change > 0 ? 'above target' : 'below target');
    }
    return d;
  }

  /** Gap against a benchmark subject — cohorts, peer LOBs, company average. */
  function versusCohort(value, cohortValue, metric, cohortLabel) {
    const d = build(metric, cohortValue, value, COMPARISON.VS_COHORT,
                    { label_from: cohortLabel });
    d.cohort_label = cohortLabel;
    return d;
  }

  /** Movement against the subject's own trailing average. */
  function versusRollingAverage(series, metric, window) {
    const w = window || ConfigService.getSetting('rolling_window');
    if (series.length < 2) return build(metric, null, null, COMPARISON.VS_ROLLING_AVG, {});
    const current = series[series.length - 1];
    const priorSlice = series.slice(Math.max(0, series.length - 1 - w), series.length - 1);
    const avg = mean(priorSlice.map(function (r) { return r.value; }));
    return build(metric, avg, current.value, COMPARISON.VS_ROLLING_AVG, {
      label_from: w + '-period average', label_to: current.period_label,
      n_to: current.denominator
    });
  }

  /**
   * Rolling average at every point in a series. Returned alongside the raw
   * series so a chart can draw both without a second round trip.
   * @return {!Array<?number>}
   */
  function rollingAverages(series, window) {
    const w = window || ConfigService.getSetting('rolling_window');
    return series.map(function (_, i) {
      if (i + 1 < w) return null;
      const slice = series.slice(i + 1 - w, i + 1).map(function (r) { return r.value; });
      return round(mean(slice), 4);
    });
  }

  /**
   * Consecutive-direction streak ending at the most recent period.
   * Direction-aware: a run of falling AHT is an IMPROVING streak.
   * @return {{direction: string, length: number}}
   */
  function streak(series, metric) {
    if (series.length < 2) return { direction: INTERPRETATION.INSUFFICIENT_DATA, length: 0 };
    const band = ConfigService.getSetting('stable_band_pp');

    let direction = null, length = 0;
    for (let i = series.length - 1; i > 0; i--) {
      const step = MetricStrategy.interpret(
        metric, series[i - 1].value, series[i].value,
        series[i].target != null ? series[i].target : series[i].target_snapshot, band);
      if (step === INTERPRETATION.INSUFFICIENT_DATA) break;
      if (direction === null) {
        if (step === INTERPRETATION.STABLE) return { direction: INTERPRETATION.STABLE, length: 1 };
        direction = step;
        length = 1;
      } else if (step === direction) {
        length++;
      } else break;
    }
    return { direction: direction || INTERPRETATION.STABLE, length: length };
  }

  /**
   * Best and worst periods in a series, chosen by direction of success rather
   * than by raw max/min.
   */
  function extremes(series, metric) {
    const withValues = series.filter(function (r) { return r.value != null; });
    if (!withValues.length) return { best: null, worst: null };
    const sorted = withValues.slice().sort(MetricStrategy.comparator(metric));
    return { best: sorted[0], worst: sorted[sorted.length - 1] };
  }

  /**
   * Trend classification over a whole series.
   * Uses the sign of a least-squares slope, then hands the direction call to
   * MetricStrategy so LOWER_IS_BETTER metrics read correctly.
   * @return {{trend: string, slope: (number|null), volatility: (number|null)}}
   */
  function classifyTrend(series, metric) {
    const values = series.map(function (r) { return r.value; })
                         .filter(function (v) { return v != null; });
    if (values.length < 3) {
      return { trend: INTERPRETATION.INSUFFICIENT_DATA, slope: null, volatility: null };
    }

    // Least-squares slope over evenly spaced periods.
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = mean(values);
    let numerator = 0, denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) * (i - xMean);
    }
    const slope = denominator === 0 ? 0 : numerator / denominator;

    const sd = stdev(values);
    // Coefficient of variation is meaningless when the mean can be zero or
    // negative (NPS), so it is only reported when it is defined.
    const cv = (yMean != null && yMean > 0 && sd != null) ? (sd / yMean) * 100 : null;

    const band = ConfigService.getSetting('stable_band_pp') / Math.max(1, n - 1);
    let trend;
    if (Math.abs(slope) <= band) {
      trend = INTERPRETATION.STABLE;
    } else {
      trend = MetricStrategy.interpret(
        metric, values[0], values[n - 1],
        series[n - 1] ? series[n - 1].target : null, 0);
    }

    return {
      trend: trend,
      slope: round(slope, 4),
      volatility: cv != null ? round(cv, 2) : null,
      stdev: sd != null ? round(sd, 4) : null
    };
  }

  return {
    build: build,
    periodOverPeriod: periodOverPeriod,
    versusTarget: versusTarget,
    versusCohort: versusCohort,
    versusRollingAverage: versusRollingAverage,
    rollingAverages: rollingAverages,
    streak: streak,
    extremes: extremes,
    classifyTrend: classifyTrend
  };
})();
