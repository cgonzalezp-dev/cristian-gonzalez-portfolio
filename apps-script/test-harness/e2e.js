/* End-to-end walk through the real API surface. */

function must(label, envelope) {
  if (!envelope.ok) {
    console.log('FAIL  ' + label + '  → ' + envelope.error.code + ': ' +
                envelope.error.message);
    process.exitCode = 1;
    return null;
  }
  console.log('PASS  ' + label);
  return envelope.data;
}

console.log('\n--- end to end ---');

must('app.setup', api('app.setup', {}));

const ctx = must('app.context', api('app.context', {}));
console.log('      role: ' + ctx.user.role + ', initialised: ' + ctx.initialised);

const lob = must('lob.save', api('lob.save',
  { lob_name: 'Vehicle Solutions', description: 'Fleet support' }));
const lob2 = must('lob.save (second)', api('lob.save', { lob_name: 'Customer Service' }));

// Duplicate name must be rejected.
const dup = api('lob.save', { lob_name: 'Vehicle Solutions' });
console.log((dup.ok ? 'FAIL' : 'PASS') + '  duplicate LOB name rejected');
if (dup.ok) process.exitCode = 1;

const csat = must('metric.save (CSAT)', api('metric.save', {
  metric_name: 'CSAT', display_name: 'Customer Satisfaction',
  definition: 'Surveys rated 4 or 5 divided by surveys received.',
  data_type: 'PROPORTION', direction_of_success: 'HIGHER_IS_BETTER',
  unit: 'PERCENT', aggregation_rule: 'SUM_RATIO', decimal_places: 1,
  requires_denominator: true, numerator_label: 'Satisfied', denominator_label: 'Surveys',
  valid_min: 0, valid_max: 100, default_frequency: 'WEEKLY',
  lob_ids: [lob.lob_id, lob2.lob_id]
}));

const aht = must('metric.save (AHT)', api('metric.save', {
  metric_name: 'AHT', display_name: 'Average Handle Time',
  definition: 'Total handle seconds divided by contacts handled.',
  data_type: 'DURATION', direction_of_success: 'LOWER_IS_BETTER',
  unit: 'SECONDS', aggregation_rule: 'WEIGHTED_MEAN', decimal_places: 0,
  requires_denominator: true, valid_min: 0, default_frequency: 'WEEKLY',
  lob_ids: [lob.lob_id]
}));

const periods = must('period.generate (13 weeks)', api('period.generate', {
  period_type: 'WEEKLY', start_date: '2026-05-04', count: 13,
  label_pattern: 'Week {week}'
}));
console.log('      created ' + periods.length + ' periods, first=' +
            periods[0].period_label + ' last=' + periods[periods.length - 1].period_label);

// Overlapping period must be rejected.
const overlap = api('period.save', {
  period_type: 'WEEKLY', period_label: 'Clash', start_date: '2026-05-06',
  end_date: '2026-05-12'
});
console.log((overlap.ok ? 'FAIL' : 'PASS') + '  overlapping period rejected');
if (overlap.ok) process.exitCode = 1;

must('target.save (CSAT global 90)', api('target.save', {
  metric_id: csat.metric_id, scope_type: 'GLOBAL', target_value: 90,
  min_threshold: 85, valid_from: '2026-05-04'
}));
must('target.save (AHT global 420)', api('target.save', {
  metric_id: aht.metric_id, scope_type: 'GLOBAL', target_value: 420,
  max_threshold: 480, valid_from: '2026-05-04'
}));
must('target.save (CSAT LOB override 93)', api('target.save', {
  metric_id: csat.metric_id, scope_type: 'LOB', scope_id: lob.lob_id,
  target_value: 93, min_threshold: 88, valid_from: '2026-05-04'
}));

// Precedence: the LOB target must beat the global one.
const resolved = must('target.resolve honours precedence', api('target.resolve', {
  metric_id: csat.metric_id, context: { lob_id: lob.lob_id, period_type: 'WEEKLY' },
  on_date: '2026-06-01'
}));
console.log((resolved && resolved.target_value === 93 && resolved.scope_type === 'LOB'
  ? 'PASS' : 'FAIL') + '  LOB target (93) beats global (90)');
if (!resolved || resolved.target_value !== 93) process.exitCode = 1;

// Agents
const mgr = must('dim.save (manager)', api('dim.save', {
  dimension: 'manager',
  record: { manager_name: 'J. Smith', email: 'jsmith@example.com', lob_id: lob.lob_id }
}));
const agents = [];
['Ada', 'Grace', 'Katherine', 'Dorothy'].forEach(function (name) {
  const a = api('dim.save', { dimension: 'agent',
    record: { agent_name: name, lob_id: lob.lob_id, manager_id: mgr.manager_id } });
  if (a.ok) agents.push(a.data);
});
console.log((agents.length === 4 ? 'PASS' : 'FAIL') + '  4 agents created');

// Submit agent CSAT across 4 weeks with varying sample sizes.
const weeks = periods.slice(-4);
const values = [
  [[88, 100], [90, 100], [91, 100], [93, 100]],   // Ada
  [[95, 200], [94, 200], [96, 200], [97, 200]],   // Grace
  [[80,  50], [79,  50], [77,  50], [75,  50]],   // Katherine
  [[100,  4], [100,  4], [100,  4], [100,  4]]    // Dorothy — tiny sample
];
let submitted = 0;
agents.forEach(function (agent, ai) {
  weeks.forEach(function (week, wi) {
    const pct = values[ai][wi][0], n = values[ai][wi][1];
    const res = api('data.submit', {
      subject_type: 'AGENT', subject_id: agent.agent_id, metric_id: csat.metric_id,
      period_id: week.period_id, numerator: Math.round(pct * n / 100), denominator: n
    });
    if (res.ok) submitted++;
    else console.log('      submit failed: ' + res.error.message);
  });
});
console.log((submitted === 16 ? 'PASS' : 'FAIL') + '  16 agent values submitted (' +
            submitted + ')');
if (submitted !== 16) process.exitCode = 1;

// Idempotency: resubmitting must supersede, not duplicate.
const again = must('data.submit (resubmit)', api('data.submit', {
  subject_type: 'AGENT', subject_id: agents[0].agent_id, metric_id: csat.metric_id,
  period_id: weeks[3].period_id, numerator: 95, denominator: 100
}));
console.log((again && again.superseded ? 'PASS' : 'FAIL') + '  resubmission superseded');
if (!again || !again.superseded) process.exitCode = 1;

const allFacts = must('data.query', api('data.query', { filters: {}, limit: 500 }));
console.log((allFacts.length === 16 ? 'PASS' : 'FAIL') +
            '  fact count still 16 after resubmit (' + allFacts.length + ')');
if (allFacts.length !== 16) process.exitCode = 1;

// Validation: impossible value must be blocked.
const bad = api('data.submit', {
  subject_type: 'AGENT', subject_id: agents[0].agent_id, metric_id: csat.metric_id,
  period_id: weeks[0].period_id, numerator: 145, denominator: 100
});
console.log((bad.ok ? 'FAIL' : 'PASS') + '  numerator > denominator rejected');
if (bad.ok) process.exitCode = 1;
if (!bad.ok) console.log('      "' + bad.error.message + '"');

// Duration entry
must('data.submit (AHT)', api('data.submit', {
  subject_type: 'LOB', subject_id: lob.lob_id, metric_id: aht.metric_id,
  period_id: weeks[3].period_id, numerator: 39000, denominator: 100
}));

// ---- rollups and read models --------------------------------------------

const series = must('dash.metricSeries (LOB CSAT)', api('dash.metricSeries', {
  metric_id: csat.metric_id, subject_type: 'LOB', subject_id: lob.lob_id,
  period_type: 'WEEKLY', period_count: 6
}));

if (series && series.current) {
  console.log('      current: ' + series.current.display +
              '  target: ' + series.current.target +
              '  status: ' + series.current.status +
              '  weighted: ' + series.current.is_weighted +
              '  n=' + series.current.observation_count);

  // Last week, after Ada's resubmission. Numerators are rounded on the way in,
  // so Katherine is 38/50 (76.0%), not 37.5/50.
  //   Ada       95/100  = 95.0%
  //   Grace    194/200  = 97.0%
  //   Katherine 38/50   = 76.0%
  //   Dorothy    4/4    = 100.0%
  const weightedNum = 95 + 194 + 38 + 4;          // 331
  const weightedDen = 100 + 200 + 50 + 4;         // 354
  const expected = weightedNum / weightedDen * 100;              // 93.50%
  const unweighted = (95 + 97 + 76 + 100) / 4;                   // 92.00%
  const ok = Math.abs(series.current.value - expected) < 0.05;
  console.log((ok ? 'PASS' : 'FAIL') + '  LOB rollup is weighted (' +
              series.current.value.toFixed(2) + '% = weighted ' +
              expected.toFixed(2) + '%, NOT the unweighted ' +
              unweighted.toFixed(2) + '%)');
  if (!ok) process.exitCode = 1;
} else {
  console.log('FAIL  no current value in series');
  process.exitCode = 1;
}

console.log('      vs prior: ' + (series.vs_prior && series.vs_prior.display) +
            ' [' + (series.vs_prior && series.vs_prior.comparison_type) + '] ' +
            (series.vs_prior && series.vs_prior.interpretation));
console.log('      vs target: ' + (series.vs_target && series.vs_target.display) +
            ' [' + (series.vs_target && series.vs_target.comparison_type) + ']');
console.log('      trend: ' + (series.trend && series.trend.trend));
(series.insights || []).slice(0, 4).forEach(function (i) {
  console.log('      • [' + i.severity + '] ' + i.text);
});

// Agent comparison — Dorothy (n=4) must not be ranked.
const cmp = must('dash.compare (agents)', api('dash.compare', {
  metric_id: csat.metric_id, subject_type: 'AGENT', period_type: 'WEEKLY'
}));
if (cmp) {
  console.log('      ranked: ' + cmp.rows.map(function (r) {
    return r.subject_name + ' ' + r.display;
  }).join(', '));
  console.log('      excluded: ' + cmp.excluded.map(function (r) {
    return r.subject_name + ' ' + r.display + ' (n=' + r.observation_count + ')';
  }).join(', ') || '(none)');
  const dorothyExcluded = cmp.excluded.some(function (r) {
    return r.subject_name === 'Dorothy';
  });
  console.log((dorothyExcluded ? 'PASS' : 'FAIL') +
              '  low-sample agent excluded from ranking');
  if (!dorothyExcluded) process.exitCode = 1;
  console.log('      population ' + cmp.stats.population_value.toFixed(2) +
              '  mean of subjects ' + cmp.stats.mean.toFixed(2) +
              '  median ' + cmp.stats.median.toFixed(2));
}

// AHT must read as a duration, and falling AHT as an improvement.
const ahtSeries = must('dash.metricSeries (AHT)', api('dash.metricSeries', {
  metric_id: aht.metric_id, subject_type: 'LOB', subject_id: lob.lob_id,
  period_type: 'WEEKLY', period_count: 4
}));
if (ahtSeries && ahtSeries.current) {
  console.log('      AHT current: ' + ahtSeries.current.display +
              '  status: ' + ahtSeries.current.status);
  const ok = ahtSeries.current.display === '6:30' &&
             ahtSeries.current.status === 'ON_TARGET';
  console.log((ok ? 'PASS' : 'FAIL') + '  AHT 390s renders 6:30 and beats a 420s target');
  if (!ok) process.exitCode = 1;
}

const exec = must('dash.executive', api('dash.executive', { period_type: 'WEEKLY' }));
if (exec) {
  console.log('      tracked ' + exec.counts.tracked + ', on target ' +
              exec.counts.on_target + ', off target ' + exec.counts.off_target);
  (exec.insights || []).slice(0, 3).forEach(function (i) {
    console.log('      • [' + i.severity + '] ' + i.text);
  });
}

must('dash.lob', api('dash.lob', { lob_id: lob.lob_id, period_type: 'WEEKLY' }));

// Charts
const chart = must('chart.save', api('chart.save', {
  chart_title: 'Weekly Service Quality',
  subtitle: 'Vehicle Solutions',
  chart_type: 'LINE', metric_ids: [csat.metric_id], lob_ids: [lob.lob_id],
  period_type: 'WEEKLY', period_count: 6, show_target_line: true
}));
const rendered = must('chart.render', api('chart.render', { chart_id: chart.chart_id }));
if (rendered) {
  console.log('      "' + rendered.chart.title + '" — ' + rendered.series.length +
              ' series, ' + rendered.labels.length + ' points, target ' +
              JSON.stringify(rendered.series[0].target));
}

// Full rebuild must reproduce the same numbers.
const before = series.current.value;
must('app.rebuild', api('app.rebuild', {}));
const after = api('dash.metricSeries', {
  metric_id: csat.metric_id, subject_type: 'LOB', subject_id: lob.lob_id,
  period_type: 'WEEKLY', period_count: 6
});
const same = after.ok && Math.abs(after.data.current.value - before) < 0.0001;
console.log((same ? 'PASS' : 'FAIL') + '  full rebuild reproduces the incremental result');
if (!same) process.exitCode = 1;

const health = must('app.health', api('app.health', {}));
if (health) {
  console.log('      fact rows ' + health.factRows + ' / ' + health.factRowLimit +
              '  partitions [' + health.partitions.join(', ') + ']');
}

console.log('\n' + (process.exitCode ? 'THERE WERE FAILURES' : 'all end-to-end checks passed'));
