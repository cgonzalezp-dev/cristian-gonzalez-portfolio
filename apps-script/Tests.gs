/**
 * Tests.gs
 * -----------------------------------------------------------------------------
 * Run runAllTests() from the Apps Script editor. Results print to the log and
 * are returned as an object.
 *
 * These cover the calculations where being wrong is silent — the ones that
 * produce a plausible number rather than an error. Aggregating a ratio as an
 * average of ratios does not throw; it just quietly reports 95% where the truth
 * is 90.4%, and nobody notices for a quarter.
 */

function runAllTests() {
  const results = [];

  function check(name, actual, expected, tolerance) {
    const tol = tolerance == null ? 0.0001 : tolerance;
    let pass;
    if (typeof expected === 'number' && typeof actual === 'number') {
      pass = Math.abs(actual - expected) <= tol;
    } else {
      pass = JSON.stringify(actual) === JSON.stringify(expected);
    }
    results.push({ name: name, pass: pass, actual: actual, expected: expected });
    console.log((pass ? 'PASS  ' : 'FAIL  ') + name +
      (pass ? '' : '  → got ' + JSON.stringify(actual) +
                    ', expected ' + JSON.stringify(expected)));
  }

  // ---------------------------------------------------------------------
  // Aggregation: the correctness rule the whole platform rests on
  // ---------------------------------------------------------------------

  const csat = {
    metric_id: 'm1', metric_name: 'CSAT', data_type: DATA_TYPE.PROPORTION,
    unit: UNIT.PERCENT, decimal_places: 1,
    direction_of_success: DIRECTION.HIGHER_IS_BETTER,
    aggregation_rule: AGGREGATION.SUM_RATIO, min_sample_observation: 20
  };

  // Agent A: 90/100 = 90%.  Agent B: 4/4 = 100%.
  // Average of the ratios is 95%. The truth is 94/104 = 90.38%.
  const facts = [
    { value: 90, numerator: 90, denominator: 100 },
    { value: 100, numerator: 4, denominator: 4 }
  ];
  const rolled = Aggregation.rollup(facts, csat);
  check('SUM_RATIO weights by denominator', round(rolled.value, 2), 90.38, 0.01);
  check('SUM_RATIO is not the mean of ratios', rolled.value === 95, false);
  check('weighted rollup is flagged weighted', rolled.is_weighted, true);

  // Missing denominators must degrade honestly, not silently.
  const partial = Aggregation.rollup([
    { value: 90, numerator: 90, denominator: 100 },
    { value: 100, numerator: null, denominator: null }
  ], csat);
  check('missing denominators fall back to simple mean', partial.value, 95);
  check('fallback is flagged unweighted', partial.is_weighted, false);
  check('fallback reports the rule it actually used',
        partial.rule, AGGREGATION.SIMPLE_MEAN);

  // ---------------------------------------------------------------------
  // Direction of success
  // ---------------------------------------------------------------------

  const aht = {
    metric_id: 'm2', metric_name: 'AHT', data_type: DATA_TYPE.DURATION,
    unit: UNIT.SECONDS, decimal_places: 0,
    direction_of_success: DIRECTION.LOWER_IS_BETTER,
    aggregation_rule: AGGREGATION.WEIGHTED_MEAN
  };

  check('falling AHT is an improvement',
        MetricStrategy.interpret(aht, 430, 390, null, 0), INTERPRETATION.IMPROVED);
  check('rising AHT is a decline',
        MetricStrategy.interpret(aht, 390, 430, null, 0), INTERPRETATION.DECLINED);
  check('rising CSAT is an improvement',
        MetricStrategy.interpret(csat, 88, 93, null, 0), INTERPRETATION.IMPROVED);
  check('falling CSAT is a decline',
        MetricStrategy.interpret(csat, 93, 88, null, 0), INTERPRETATION.DECLINED);

  // 7:10 -> 6:30 is a 40-second improvement, not a 9.3% one.
  check('duration delta reads in seconds',
        MetricStrategy.formatDelta(aht, 390 - 430), '-0:40');
  check('percentage delta reads in percentage points',
        MetricStrategy.formatDelta(csat, 5), '+5.0pp');

  // TARGET_BASED improves by moving toward the target from either side.
  const volume = {
    metric_id: 'm3', metric_name: 'Volume', data_type: DATA_TYPE.COUNT,
    unit: UNIT.COUNT, decimal_places: 0,
    direction_of_success: DIRECTION.TARGET_BASED, aggregation_rule: AGGREGATION.SUM
  };
  check('target-based improves moving up toward target',
        MetricStrategy.interpret(volume, 800, 950, 1000, 0), INTERPRETATION.IMPROVED);
  check('target-based improves moving down toward target',
        MetricStrategy.interpret(volume, 1200, 1050, 1000, 0), INTERPRETATION.IMPROVED);
  check('target-based declines overshooting further',
        MetricStrategy.interpret(volume, 1050, 1200, 1000, 0), INTERPRETATION.DECLINED);

  // ---------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------

  check('CSAT at target is on target',
        MetricStrategy.statusOf(csat, 90, 90, 85, null), STATUS.ON_TARGET);
  check('CSAT between threshold and target is at risk',
        MetricStrategy.statusOf(csat, 87, 90, 85, null), STATUS.AT_RISK);
  check('CSAT below threshold is below target',
        MetricStrategy.statusOf(csat, 80, 90, 85, null), STATUS.BELOW_TARGET);
  check('AHT under target is on target',
        MetricStrategy.statusOf(aht, 400, 420, null, 480), STATUS.ON_TARGET);
  check('AHT over target reads above target, not below',
        MetricStrategy.statusOf(aht, 500, 420, null, 480), STATUS.ABOVE_TARGET);

  // ---------------------------------------------------------------------
  // Ranking respects direction
  // ---------------------------------------------------------------------

  const rows = [
    { subject_id: 'a', value: 88, denominator: 100 },
    { subject_id: 'b', value: 94, denominator: 100 },
    { subject_id: 'c', value: 91, denominator: 100 }
  ];
  check('higher-is-better ranks descending',
        Aggregation.rank(rows.slice(), csat).ranked[0].subject_id, 'b');
  check('lower-is-better ranks ascending',
        Aggregation.rank(rows.slice(), aht).ranked[0].subject_id, 'a');

  // A tiny sample must never top a leaderboard.
  const withTiny = [
    { subject_id: 'a', value: 88, denominator: 100 },
    { subject_id: 'tiny', value: 100, denominator: 4 }
  ];
  const ranked = Aggregation.rank(withTiny, csat);
  check('low-sample subject is excluded from ranking', ranked.ranked.length, 1);
  check('low-sample subject is still returned', ranked.excluded.length, 1);
  check('top rank goes to the reliable value', ranked.ranked[0].subject_id, 'a');

  // ---------------------------------------------------------------------
  // Population statistics distinguish the three "averages"
  // ---------------------------------------------------------------------

  const stats = Aggregation.populationStats([
    { value: 90, numerator: 90, denominator: 100 },
    { value: 80, numerator: 160, denominator: 200 },
    { value: 100, numerator: 30, denominator: 30 }
  ], csat);
  check('population value is weighted',
        round(stats.population_value, 2), round(280 / 330 * 100, 2), 0.01);
  check('mean of subjects is unweighted', round(stats.mean, 2), 90);
  check('median is the middle subject', stats.median, 90);

  // ---------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------

  check('proportion derives as a percentage',
        MetricStrategy.deriveValue(csat, 45, 50), 90);
  check('duration derives as a mean',
        MetricStrategy.deriveValue(aht, 42000, 100), 420);
  check('divide by zero yields null',
        MetricStrategy.deriveValue(csat, 10, 0), null);

  // ---------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------

  check('seconds format as m:ss', formatDuration(430), '7:10');
  check('seconds format as m:ss (2)', formatDuration(390), '6:30');
  check('over an hour formats as h:mm:ss', formatDuration(3725), '1:02:05');
  check('percent formats with its unit', formatValue(92.35, UNIT.PERCENT, 1), '92.4%');

  // ---------------------------------------------------------------------
  // Period ordering — labels must never drive the sort
  // ---------------------------------------------------------------------

  const periods = [
    { period_label: 'Week 4',  sort_key: '2026-01-19', period_type: 'WEEKLY' },
    { period_label: 'Week 31', sort_key: '2026-07-27', period_type: 'WEEKLY' },
    { period_label: 'August W1', sort_key: '2026-08-03', period_type: 'WEEKLY' }
  ];
  const sorted = periods.slice().sort(PeriodEngine.bySortKey)
    .map(function (p) { return p.period_label; });
  check('periods order by date, not by label string',
        sorted, ['Week 4', 'Week 31', 'August W1']);

  // Naive string sort would put "Week 31" before "Week 4" — the bug this guards.
  const naive = periods.slice().sort(function (a, b) {
    return a.period_label.localeCompare(b.period_label);
  }).map(function (p) { return p.period_label; });
  check('label sort is demonstrably wrong (guard test)',
        naive[0] === 'Week 4', false);

  // ---------------------------------------------------------------------
  // Date helpers
  // ---------------------------------------------------------------------

  check('ISO dates round-trip', toDateStr('2026-07-27'), '2026-07-27');
  check('dd/MM/yyyy parses', toDateStr('27/07/2026'), '2026-07-27');
  check('addDays crosses a month boundary', addDays('2026-07-30', 5), '2026-08-04');
  check('daysBetween counts a week', daysBetween('2026-07-27', '2026-08-02'), 6);

  // ---------------------------------------------------------------------
  // Statistics helpers
  // ---------------------------------------------------------------------

  check('median of an even set interpolates', median([1, 2, 3, 4]), 2.5);
  check('percentile at the midpoint', Aggregation.percentile([1, 2, 3, 4, 5], 50), 3);
  check('stdev needs two observations', stdev([5]), null);
  check('sample stdev uses n-1', round(stdev([2, 4, 4, 4, 5, 5, 7, 9]), 4), 2.1381, 0.001);

  // ---------------------------------------------------------------------
  // Idempotency
  // ---------------------------------------------------------------------

  const k1 = Facts.keyFor('AGENT', 'a1', 'm1', 'p1', 'survey');
  const k2 = Facts.keyFor('AGENT', 'a1', 'm1', 'p1', 'survey');
  const k3 = Facts.keyFor('AGENT', 'a1', 'm1', 'p1', 'operational');
  check('the same submission hashes identically', k1 === k2, true);
  check('a different instrument is a different measurement', k1 === k3, false);

  // ---------------------------------------------------------------------

  const passed = results.filter(function (r) { return r.pass; }).length;
  console.log('\n' + passed + ' / ' + results.length + ' passed');
  return { passed: passed, total: results.length,
           failures: results.filter(function (r) { return !r.pass; }) };
}
