/**
 * MetricStrategy.gs
 * -----------------------------------------------------------------------------
 * THE dispatch table. This file is the answer to "the code must not contain
 * if metric == 'CSAT'".
 *
 * The distinction that makes it work:
 *   FORBIDDEN  branching on metric IDENTITY   ->  if (metric.name === 'CSAT')
 *   REQUIRED   branching on metric TYPE       ->  if (metric.data_type === PROPORTION)
 *
 * A percentage and a duration genuinely need different arithmetic; pretending
 * otherwise produces "AHT improved by 40%" where it should say "40 seconds".
 * So the engines branch exactly once, here, on a declared type — and every
 * metric anyone ever creates simply picks one.
 *
 * Adding CSAT, NPS, Attrition, Forecast Accuracy = a config row. Zero code.
 * Adding a new KIND of mathematics = one entry below. Should happen ~never.
 */

const MetricStrategy = (function () {

  /**
   * @typedef {{
   *   deltaUnit: string,          // how a change is expressed
   *   defaultAggregation: string,
   *   defaultUnit: string,
   *   supportsDenominator: boolean,
   *   controlChart: string,       // chart family for the statistics phase
   *   validRange: {min: (number|null), max: (number|null)},
   *   deltaLabel: function(number, !Object): string
   * }}
   */
  const STRATEGIES = {

    [DATA_TYPE.PROPORTION]: {
      deltaUnit: 'pp',
      defaultAggregation: AGGREGATION.SUM_RATIO,
      defaultUnit: UNIT.PERCENT,
      supportsDenominator: true,
      // p-chart limits vary with each subject's denominator, which is the whole
      // reason numerator/denominator capture is mandatory for this type.
      controlChart: 'P_CHART',
      validRange: { min: 0, max: 100 },
      deltaLabel: function (delta, metric) {
        return signedFixed(delta, metric.decimal_places) + 'pp';
      }
    },

    [DATA_TYPE.ORDINAL_SCALE]: {
      deltaUnit: 'points',
      defaultAggregation: AGGREGATION.WEIGHTED_MEAN,
      defaultUnit: UNIT.SCORE,
      supportsDenominator: true,
      controlChart: 'XBAR_S',
      validRange: { min: null, max: null },  // scale bounds come from metric config
      deltaLabel: function (delta, metric) {
        return signedFixed(delta, metric.decimal_places) + ' pts';
      }
    },

    [DATA_TYPE.DURATION]: {
      deltaUnit: 'seconds',
      defaultAggregation: AGGREGATION.WEIGHTED_MEAN,
      defaultUnit: UNIT.SECONDS,
      supportsDenominator: true,   // denominator = contacts handled
      controlChart: 'I_MR',
      validRange: { min: 0, max: null },
      deltaLabel: function (delta) {
        const abs = Math.abs(Math.round(delta));
        return (delta >= 0 ? '+' : '-') + formatDuration(abs);
      }
    },

    [DATA_TYPE.COUNT]: {
      deltaUnit: 'absolute',
      defaultAggregation: AGGREGATION.SUM,
      defaultUnit: UNIT.COUNT,
      supportsDenominator: false,
      controlChart: 'C_CHART',
      validRange: { min: 0, max: null },
      deltaLabel: function (delta) {
        return signed(Math.round(delta)) + '';
      }
    },

    [DATA_TYPE.RATE_PER_UNIT]: {
      deltaUnit: 'rate',
      defaultAggregation: AGGREGATION.SUM_RATIO,
      defaultUnit: UNIT.RATIO,
      supportsDenominator: true,
      controlChart: 'U_CHART',
      validRange: { min: 0, max: null },
      deltaLabel: function (delta, metric) {
        return signedFixed(delta, metric.decimal_places);
      }
    },

    [DATA_TYPE.CURRENCY]: {
      deltaUnit: 'absolute',
      defaultAggregation: AGGREGATION.SUM,
      defaultUnit: UNIT.CURRENCY_USD,
      supportsDenominator: false,
      controlChart: 'I_MR',
      validRange: { min: null, max: null },
      deltaLabel: function (delta, metric) {
        return (delta >= 0 ? '+' : '-') +
               formatValue(Math.abs(delta), UNIT.CURRENCY_USD, metric.decimal_places);
      }
    },

    [DATA_TYPE.INDEX_SCORE]: {
      deltaUnit: 'points',
      defaultAggregation: AGGREGATION.WEIGHTED_MEAN,
      defaultUnit: UNIT.POINTS,
      supportsDenominator: true,
      controlChart: 'I_MR',
      validRange: { min: -100, max: 100 },
      deltaLabel: function (delta, metric) {
        return signedFixed(delta, metric.decimal_places) + ' pts';
      }
    }
  };

  function signed(n) { return (n > 0 ? '+' : '') + n; }

  /**
   * Signed, fixed-precision change. Deltas carry the same decimal places as the
   * values they describe: "+5.0pp" beside "92.4%", never "+5pp" beside "92.4%".
   * toFixed already supplies the minus sign, so only a plus needs adding.
   */
  function signedFixed(n, decimalPlaces) {
    const dp = decimalPlaces == null ? 1 : decimalPlaces;
    const v = round(n, dp);
    return (v > 0 ? '+' : '') + v.toFixed(dp);
  }

  /** @return {!Object} Strategy for a metric. Throws on an unknown data type. */
  function forMetric(metric) {
    const s = STRATEGIES[metric.data_type];
    if (!s) {
      throw new AppError('CONFIG',
        'Metric "' + metric.metric_name + '" has an unrecognised data type "' +
        metric.data_type + '". Fix it in Configuration → Metrics.');
    }
    return s;
  }

  /** @return {!Array<{value:string,label:string,defaults:!Object}>} for config UI */
  function catalogue() {
    return Object.keys(STRATEGIES).map(function (k) {
      const s = STRATEGIES[k];
      return {
        value: k,
        label: k.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, function (c) {
          return c.toUpperCase();
        }),
        defaults: {
          aggregation_rule: s.defaultAggregation,
          unit: s.defaultUnit,
          requires_denominator: s.supportsDenominator,
          valid_min: s.validRange.min,
          valid_max: s.validRange.max
        },
        supportsDenominator: s.supportsDenominator,
        controlChart: s.controlChart,
        deltaUnit: s.deltaUnit
      };
    });
  }

  /**
   * Derive a value from numerator/denominator according to data type.
   * Storage is canonical: proportions are 0-100, durations are seconds.
   * @return {number|null}
   */
  function deriveValue(metric, numerator, denominator) {
    if (numerator == null || denominator == null) return null;
    if (denominator === 0) return null;
    switch (metric.data_type) {
      case DATA_TYPE.PROPORTION:
        return (numerator / denominator) * 100;
      case DATA_TYPE.RATE_PER_UNIT:
      case DATA_TYPE.ORDINAL_SCALE:
      case DATA_TYPE.DURATION:
      case DATA_TYPE.INDEX_SCORE:
        return numerator / denominator;
      case DATA_TYPE.COUNT:
      case DATA_TYPE.CURRENCY:
        return numerator;
      default:
        return numerator / denominator;
    }
  }

  /**
   * Format a change for display, in the metric's own delta unit.
   * A percentage moves in percentage points, a duration in seconds. The UI never
   * has to know which — it asks here.
   * @return {string}
   */
  function formatDelta(metric, delta) {
    if (delta == null || !isFinite(delta)) return '—';
    return forMetric(metric).deltaLabel(delta, metric);
  }

  /**
   * Direction-aware interpretation of a change.
   *
   * This is the single place that decides whether a movement is good news. AHT
   * falling is an improvement; CSAT falling is not; a TARGET_BASED metric
   * improves by moving *toward* its target from either side. Nothing downstream
   * re-derives this.
   *
   * @return {string} INTERPRETATION
   */
  function interpret(metric, from, to, target, stableBand) {
    if (from == null || to == null) return INTERPRETATION.INSUFFICIENT_DATA;

    const delta = to - from;
    const band = stableBand == null ? 0 : Math.abs(stableBand);
    if (Math.abs(delta) <= band) return INTERPRETATION.STABLE;

    switch (metric.direction_of_success) {
      case DIRECTION.HIGHER_IS_BETTER:
        return delta > 0 ? INTERPRETATION.IMPROVED : INTERPRETATION.DECLINED;

      case DIRECTION.LOWER_IS_BETTER:
        return delta < 0 ? INTERPRETATION.IMPROVED : INTERPRETATION.DECLINED;

      case DIRECTION.TARGET_BASED: {
        if (target == null) return INTERPRETATION.STABLE;
        const before = Math.abs(from - target);
        const after = Math.abs(to - target);
        if (Math.abs(after - before) <= band) return INTERPRETATION.STABLE;
        return after < before ? INTERPRETATION.IMPROVED : INTERPRETATION.DECLINED;
      }

      default:
        return INTERPRETATION.STABLE;
    }
  }

  /**
   * Status of a value against its resolved target and thresholds.
   * @return {string} STATUS
   */
  function statusOf(metric, value, target, minThreshold, maxThreshold) {
    if (value == null) return STATUS.INSUFFICIENT_DATA;
    if (target == null && minThreshold == null && maxThreshold == null) return STATUS.NO_TARGET;

    switch (metric.direction_of_success) {
      case DIRECTION.HIGHER_IS_BETTER:
        if (target != null && value >= target) return STATUS.ON_TARGET;
        if (minThreshold != null && value >= minThreshold) return STATUS.AT_RISK;
        return STATUS.BELOW_TARGET;

      case DIRECTION.LOWER_IS_BETTER:
        if (target != null && value <= target) return STATUS.ON_TARGET;
        if (maxThreshold != null && value <= maxThreshold) return STATUS.AT_RISK;
        return STATUS.ABOVE_TARGET;

      case DIRECTION.TARGET_BASED: {
        const lo = minThreshold != null ? minThreshold : (target != null ? target : null);
        const hi = maxThreshold != null ? maxThreshold : (target != null ? target : null);
        if (lo != null && value < lo) return STATUS.BELOW_TARGET;
        if (hi != null && value > hi) return STATUS.ABOVE_TARGET;
        return STATUS.ON_TARGET;
      }

      default:
        return STATUS.NO_TARGET;
    }
  }

  /**
   * Ranking comparator. "Best" depends on direction of success, so leaderboards
   * never hardcode a sort order.
   * @return {function(!Object,!Object):number} sorts best-first
   */
  function comparator(metric, valueOf) {
    const get = valueOf || function (r) { return r.value; };
    const dir = metric.direction_of_success;
    return function (a, b) {
      const va = get(a), vb = get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (dir === DIRECTION.LOWER_IS_BETTER) return va - vb;
      if (dir === DIRECTION.TARGET_BASED) {
        const t = num(a.target) != null ? num(a.target) : 0;
        return Math.abs(va - t) - Math.abs(vb - t);
      }
      return vb - va;
    };
  }

  /** Which aggregation rules make sense for this data type (constrains the UI). */
  function allowedAggregations(metric) {
    const s = forMetric(metric);
    const base = [AGGREGATION.MEDIAN, AGGREGATION.MIN, AGGREGATION.MAX, AGGREGATION.LAST];
    switch (metric.data_type) {
      case DATA_TYPE.PROPORTION:
      case DATA_TYPE.RATE_PER_UNIT:
        // Deliberately no SUM: summing percentages is meaningless.
        return [AGGREGATION.SUM_RATIO, AGGREGATION.WEIGHTED_MEAN, AGGREGATION.SIMPLE_MEAN]
               .concat(base);
      case DATA_TYPE.COUNT:
      case DATA_TYPE.CURRENCY:
        return [AGGREGATION.SUM, AGGREGATION.SIMPLE_MEAN].concat(base);
      default:
        return [s.defaultAggregation, AGGREGATION.SIMPLE_MEAN].concat(base);
    }
  }

  return {
    forMetric: forMetric,
    catalogue: catalogue,
    deriveValue: deriveValue,
    formatDelta: formatDelta,
    interpret: interpret,
    statusOf: statusOf,
    comparator: comparator,
    allowedAggregations: allowedAggregations
  };
})();
