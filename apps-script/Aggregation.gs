/**
 * Aggregation.gs
 * -----------------------------------------------------------------------------
 * Rolling child rows into a parent value.
 *
 * THE CENTRAL CORRECTNESS RULE OF THIS PROJECT:
 *
 *   A ratio metric must be aggregated as sum(numerator) / sum(denominator),
 *   NOT as the average of the children's ratios.
 *
 *   Agent A: 90 of 100 surveys ->  90%
 *   Agent B:  4 of   4 surveys -> 100%
 *   Average of the ratios ............ 95%      <- wrong
 *   Ratio of the sums ................ 90.4%    <- right
 *
 * Averaging agent-level percentages is wrong whenever agents have different
 * denominators, which is always. Every "population average", every LOB rollup
 * and every peer comparison in this platform depends on getting this right.
 *
 * Where a denominator genuinely is not available, SIMPLE_MEAN is used and the
 * result is marked is_weighted=false so the UI can show an "unweighted" badge.
 * Honest degradation, never silent wrongness.
 */

const Aggregation = (function () {

  /**
   * Roll a set of fact rows into a single value.
   * @param {!Array<!Object>} facts
   * @param {!Object} metric
   * @param {string=} ruleOverride  optional AGGREGATION rule
   * @return {{value, numerator_sum, denominator_sum, rule, is_weighted,
   *           contributor_count, observation_count}}
   */
  function rollup(facts, metric, ruleOverride) {
    const rows = (facts || []).filter(function (f) { return f.value != null; });
    const empty = {
      value: null, numerator_sum: null, denominator_sum: null,
      rule: ruleOverride || metric.aggregation_rule, is_weighted: false,
      contributor_count: 0, observation_count: 0
    };
    if (!rows.length) return empty;

    const rule = ruleOverride || metric.aggregation_rule ||
                 MetricStrategy.forMetric(metric).defaultAggregation;

    const values = rows.map(function (r) { return r.value; });
    const numerators = rows.map(function (r) { return r.numerator; });
    const denominators = rows.map(function (r) { return r.denominator; });

    const haveAllDenominators = denominators.every(function (d) {
      return d != null && d > 0;
    });
    const haveAllNumerators = numerators.every(function (n) { return n != null; });

    const numSum = haveAllNumerators ? sum(numerators) : null;
    const denSum = haveAllDenominators ? sum(denominators) : null;

    let value = null;
    let effectiveRule = rule;
    let weighted = false;

    switch (rule) {
      case AGGREGATION.SUM_RATIO:
        if (haveAllNumerators && haveAllDenominators && denSum > 0) {
          value = MetricStrategy.deriveValue(metric, numSum, denSum);
          weighted = true;
        } else {
          // Cannot do the correct thing — degrade and say so.
          value = mean(values);
          effectiveRule = AGGREGATION.SIMPLE_MEAN;
          weighted = false;
        }
        break;

      case AGGREGATION.WEIGHTED_MEAN:
        if (haveAllDenominators && denSum > 0) {
          let acc = 0;
          for (let i = 0; i < rows.length; i++) acc += values[i] * denominators[i];
          value = acc / denSum;
          weighted = true;
        } else {
          value = mean(values);
          effectiveRule = AGGREGATION.SIMPLE_MEAN;
          weighted = false;
        }
        break;

      case AGGREGATION.SUM:
        value = sum(values);
        weighted = true;   // a sum of counts needs no weighting to be correct
        break;

      case AGGREGATION.MEDIAN:  value = median(values); break;
      case AGGREGATION.MIN:     value = Math.min.apply(null, values); break;
      case AGGREGATION.MAX:     value = Math.max.apply(null, values); break;
      case AGGREGATION.COUNT:   value = values.length; weighted = true; break;
      case AGGREGATION.LAST: {
        const sorted = rows.slice().sort(function (a, b) {
          return String(a.period_start).localeCompare(String(b.period_start));
        });
        value = sorted[sorted.length - 1].value;
        break;
      }
      case AGGREGATION.SIMPLE_MEAN:
      default:
        value = mean(values);
        effectiveRule = AGGREGATION.SIMPLE_MEAN;
        weighted = false;
        break;
    }

    return {
      value: value,
      numerator_sum: numSum,
      denominator_sum: denSum,
      rule: effectiveRule,
      is_weighted: weighted,
      contributor_count: rows.length,
      observation_count: denSum != null ? denSum : rows.length
    };
  }

  /**
   * Population statistics across subjects for one metric and period.
   *
   * Deliberately reports the weighted population value AND the unweighted mean
   * AND the median as three distinct numbers. They answer different questions
   * and are routinely confused:
   *
   *   population value  what the business actually delivered
   *   mean of subjects  what the typical subject delivered
   *   median            what the middle subject delivered (robust to outliers)
   *
   * Subjects below the observation gate are excluded from the distribution
   * statistics — a 100% score on 4 surveys should not move the peer benchmark —
   * but are still counted and returned so nothing disappears silently.
   */
  function populationStats(facts, metric) {
    const gate = ConfigService.getSetting('min_sample_observation');
    const minObs = metric.min_sample_observation || gate;

    const all = (facts || []).filter(function (f) { return f.value != null; });
    const eligible = all.filter(function (f) {
      return f.denominator == null || f.denominator >= minObs;
    });
    const excluded = all.length - eligible.length;

    const rolled = rollup(eligible, metric);
    const values = eligible.map(function (f) { return f.value; });
    const sorted = values.slice().sort(function (a, b) { return a - b; });

    const popGate = Validation.sampleGate('POPULATION', eligible.length, metric);

    return {
      subject_count: all.length,
      eligible_count: eligible.length,
      excluded_low_sample: excluded,
      population_value: rolled.value,      // weighted — the business number
      is_weighted: rolled.is_weighted,
      aggregation_rule: rolled.rule,
      observation_count: rolled.observation_count,
      mean: mean(values),                  // unweighted mean of subjects
      median: median(values),
      stdev: stdev(values),
      min: sorted.length ? sorted[0] : null,
      max: sorted.length ? sorted[sorted.length - 1] : null,
      q1: percentile(sorted, 25),
      q3: percentile(sorted, 75),
      iqr: sorted.length >= 4 ? percentile(sorted, 75) - percentile(sorted, 25) : null,
      reliable: popGate.ok,
      gate_message: popGate.message
    };
  }

  /** Linear-interpolation percentile on a pre-sorted array. */
  function percentile(sortedValues, p) {
    if (!sortedValues.length) return null;
    if (sortedValues.length === 1) return sortedValues[0];
    const idx = (p / 100) * (sortedValues.length - 1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sortedValues[lo];
    return sortedValues[lo] + (sortedValues[hi] - sortedValues[lo]) * (idx - lo);
  }

  /**
   * Rank subjects best-first according to the metric's direction of success.
   * Subjects below the observation gate are returned but never ranked — they
   * carry rank=null and a gate message, so a 4-survey agent can never top a
   * leaderboard.
   */
  function rank(facts, metric) {
    const minObs = metric.min_sample_observation ||
                   ConfigService.getSetting('min_sample_observation');

    const rows = (facts || []).filter(function (f) { return f.value != null; });
    const rankable = rows.filter(function (f) {
      return f.denominator == null || f.denominator >= minObs;
    });
    const unrankable = rows.filter(function (f) {
      return f.denominator != null && f.denominator < minObs;
    });

    rankable.sort(MetricStrategy.comparator(metric));
    rankable.forEach(function (r, i) { r.rank = i + 1; });
    unrankable.forEach(function (r) {
      r.rank = null;
      r.gate_message = Validation.sampleGate('OBSERVATION', r.denominator, metric).message;
    });

    return { ranked: rankable, excluded: unrankable, total: rows.length };
  }

  /**
   * Target attainment as a ratio of achieved to target, direction-aware.
   * For LOWER_IS_BETTER the ratio is inverted, so >1 always means "beating it".
   * @return {number|null}
   */
  function attainment(value, target, metric) {
    if (value == null || target == null || target === 0) return null;
    return metric.direction_of_success === DIRECTION.LOWER_IS_BETTER
      ? target / value
      : value / target;
  }

  return {
    rollup: rollup,
    populationStats: populationStats,
    percentile: percentile,
    rank: rank,
    attainment: attainment
  };
})();
