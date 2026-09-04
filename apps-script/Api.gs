/**
 * Api.gs
 * -----------------------------------------------------------------------------
 * The single entry point from the browser.
 *
 * The client calls exactly one server function — api(action, payload) — which
 * dispatches through a table. That gives one place for authorisation, one place
 * for error shaping, one place for timing, and a client that never has to know
 * which module owns what.
 *
 * Every response uses the same envelope:
 *   { ok: true,  data: ..., meta: {ms, role} }
 *   { ok: false, error: {code, message, details} }
 *
 * Internal errors are logged and replaced with a generic message. Only AppError
 * — which is raised deliberately for situations a user can act on — is passed
 * through verbatim.
 */

/**
 * @param {string} action
 * @param {Object=} payload
 * @return {!Object} envelope
 */
function api(action, payload) {
  const started = Date.now();
  const p = payload || {};
  try {
    const handler = ROUTES[action];
    if (!handler) throw new AppError('NOT_FOUND', 'Unknown action: ' + action);
    if (handler.capability) Auth.require(handler.capability);

    const data = handler.fn(p);
    return {
      ok: true,
      data: data,
      meta: { ms: Date.now() - started, role: Auth.role(), action: action }
    };
  } catch (e) {
    if (e && e.userFacing) {
      return { ok: false,
               error: { code: e.code, message: e.message, details: e.details || null },
               meta: { ms: Date.now() - started, action: action } };
    }
    Log.error('api:' + action, e);
    return {
      ok: false,
      error: { code: 'INTERNAL',
               message: 'Something went wrong on our side. The error has been logged.' },
      meta: { ms: Date.now() - started, action: action }
    };
  }
}

const ROUTES = {

  // ------------------------------------------------------------ bootstrap

  'app.context': { fn: function () {
    return {
      app: { name: APP.NAME, version: APP.VERSION, schema: APP.SCHEMA_VERSION },
      user: Auth.context(),
      settings: ConfigService.allSettings(),
      enums: {
        dataTypes: MetricStrategy.catalogue(),
        directions: Object.keys(DIRECTION),
        units: Object.keys(UNIT),
        aggregations: Object.keys(AGGREGATION),
        periodTypes: Object.keys(PERIOD_TYPE),
        subjectTypes: Object.keys(SUBJECT_TYPE),
        chartTypes: Object.keys(CHART_TYPE),
        targetScopes: Object.keys(TARGET_SCOPE),
        statuses: Object.keys(STATUS)
      },
      initialised: ConfigService.listMetrics(true).length > 0
    };
  }},

  'app.setup': { capability: 'admin', fn: function () { return Bootstrap.setup(); }},
  'app.seedStarter': { capability: 'admin',
    fn: function () { return Bootstrap.seedStarterConfig(); }},
  'app.health': { capability: 'admin', fn: function () {
    const h = Repository.health();
    h.slo = MIGRATION_SLO;
    h.lastJobs = Repository.readAll(TABLE.JOB).slice(-10).reverse();
    return h;
  }},
  'app.rebuild': { capability: 'admin',
    fn: function () { return MaterializedViews.rebuildAll(''); }},

  // ------------------------------------------------------------------ LOB

  'lob.list': { fn: function (p) { return ConfigService.listLobs(bool(p.includeInactive)); }},
  'lob.save': { capability: 'config', fn: function (p) { return ConfigService.saveLob(p); }},
  'lob.setStatus': { capability: 'config',
    fn: function (p) { return ConfigService.setLobStatus(p.lob_id, p.status); }},

  // --------------------------------------------------------------- metric

  'metric.list': { fn: function (p) {
    const metrics = p.lob_id
      ? ConfigService.metricsForLob(p.lob_id, bool(p.includeInactive))
      : ConfigService.listMetrics(bool(p.includeInactive));
    return metrics.map(function (m) {
      const pub = Dashboard.publicMetric(m);
      pub.status = m.status;
      pub.lob_ids = ConfigService.lobIdsForMetric(m.metric_id);
      pub.valid_min = m.valid_min;
      pub.valid_max = m.valid_max;
      pub.default_frequency = m.default_frequency;
      pub.min_sample_observation = m.min_sample_observation;
      pub.source_system = m.source_system;
      pub.owner = m.owner;
      pub.allowed_aggregations = MetricStrategy.allowedAggregations(m);
      return pub;
    });
  }},
  'metric.save': { capability: 'config',
    fn: function (p) { return ConfigService.saveMetric(p); }},
  'metric.setStatus': { capability: 'config',
    fn: function (p) { return ConfigService.setMetricStatus(p.metric_id, p.status); }},

  // --------------------------------------------------------------- target

  'target.list': { fn: function (p) { return ConfigService.listTargets(p.metric_id); }},
  'target.save': { capability: 'config',
    fn: function (p) { return ConfigService.saveTarget(p); }},
  'target.resolve': { fn: function (p) {
    return ConfigService.resolveTarget(p.metric_id, p.context || {}, p.on_date);
  }},

  // --------------------------------------------------------------- period

  'period.list': { fn: function (p) {
    return p.period_type
      ? PeriodEngine.listByType(p.period_type, p.calendar_id)
      : PeriodEngine.all(p.calendar_id);
  }},
  'period.save': { capability: 'config', fn: function (p) { return PeriodEngine.save(p); }},
  'period.generate': { capability: 'config',
    fn: function (p) { return PeriodEngine.generate(p); }},
  'period.setStatus': { capability: 'config',
    fn: function (p) { return PeriodEngine.setStatus(p.period_id, p.status); }},

  // ----------------------------------------------------------- dimensions

  'dim.list': { fn: function (p) {
    return ConfigService.listDimension(tableFor(p.dimension), bool(p.includeInactive));
  }},
  'dim.save': { capability: 'config', fn: function (p) {
    const spec = DIMENSION_SPEC[p.dimension];
    if (!spec) throw new AppError('VALIDATION', 'Unknown dimension: ' + p.dimension);
    return ConfigService.saveDimension(spec.table, p.record, spec.nameField);
  }},
  'dim.setStatus': { capability: 'config', fn: function (p) {
    return ConfigService.setDimensionStatus(tableFor(p.dimension), p.id, p.status);
  }},

  // ----------------------------------------------------------------- data

  'data.submit': { capability: 'entry', fn: function (p) { return Facts.submit(p); }},
  'data.submitBatch': { capability: 'entry',
    fn: function (p) { return Facts.submitBatch(p.rows || []); }},
  'data.query': { fn: function (p) {
    const rows = Facts.query(p.filters || {});
    const labels = {};
    PeriodEngine.all().forEach(function (x) { labels[x.period_id] = x.period_label; });
    return rows.slice(0, num(p.limit) || 500).map(function (r) {
      r.period_label = labels[r.period_id] || r.period_id;
      return r;
    });
  }},
  'data.formConfig': { fn: function (p) { return formConfig(p); }},
  'data.delete': { capability: 'admin',
    fn: function (p) { return Facts.remove(p.fact_id, p.year); }},

  // ----------------------------------------------------------- dashboards

  'dash.executive': { capability: 'analytics',
    fn: function (p) { return Dashboard.executiveSummary(p); }},
  'dash.lob': { capability: 'analytics',
    fn: function (p) { return Dashboard.lobScorecard(p); }},
  'dash.metricSeries': { capability: 'analytics', fn: function (p) {
    const s = Dashboard.metricSeries(p);
    s.insights = InsightEngine.forSeries(s);
    return s;
  }},
  'dash.compare': { capability: 'analytics', fn: function (p) {
    const c = Dashboard.compareSubjects(p);
    c.insights = InsightEngine.forComparison(c);
    return c;
  }},

  // --------------------------------------------------------------- charts

  'chart.list': { fn: function (p) { return ChartConfig.list(p.dashboard_id); }},
  'chart.save': { capability: 'config', fn: function (p) { return ChartConfig.save(p); }},
  'chart.setStatus': { capability: 'config',
    fn: function (p) { return ChartConfig.setStatus(p.chart_id, p.status); }},
  'chart.render': { capability: 'analytics', fn: function (p) {
    const chart = Repository.findById(TABLE.CHART, p.chart_id);
    if (!chart) throw new AppError('NOT_FOUND', 'Chart not found.');
    return ChartConfig.render(chart, p.overrides);
  }},
  'chart.renderDashboard': { capability: 'analytics',
    fn: function (p) { return ChartConfig.renderDashboard(p.dashboard_id, p.overrides); }},

  // ------------------------------------------------------------- settings

  'settings.save': { capability: 'admin', fn: function (p) {
    Object.keys(p.settings || {}).forEach(function (k) {
      ConfigService.setSetting(k, p.settings[k]);
    });
    return ConfigService.allSettings();
  }},
  'audit.recent': { capability: 'admin', fn: function (p) {
    return Repository.readAll(TABLE.AUDIT).slice(-(num(p.limit) || 100)).reverse();
  }}
};

const DIMENSION_SPEC = {
  agent:   { table: TABLE.AGENT, nameField: 'agent_name' },
  team:    { table: TABLE.TEAM, nameField: 'team_name' },
  manager: { table: TABLE.MANAGER, nameField: 'manager_name' },
  region:  { table: TABLE.REGION, nameField: 'region_name' },
  cohort:  { table: TABLE.COHORT, nameField: 'cohort_name' }
};

function tableFor(dimension) {
  const spec = DIMENSION_SPEC[dimension];
  if (!spec) throw new AppError('VALIDATION', 'Unknown dimension: ' + dimension);
  return spec.table;
}

/**
 * Everything the data-entry form needs to build itself for a given
 * metric/subject/period. The form has no hardcoded fields: which inputs appear,
 * what they are labelled, what range they accept and whether a denominator is
 * required all come from here.
 */
function formConfig(p) {
  const metric = p.metric_id ? ConfigService.getMetric(p.metric_id) : null;
  if (!metric) {
    return { metric: null, fields: [], target: null };
  }
  const strategy = MetricStrategy.forMetric(metric);
  const period = p.period_id ? PeriodEngine.get(p.period_id) : null;

  let target = null;
  if (period) {
    const ctx = Facts.resolveSubjectContext(p.subject_type, p.subject_id);
    target = ConfigService.resolveTarget(metric.metric_id, {
      agent_id: ctx.agent_id, manager_id: ctx.manager_id, team_id: ctx.team_id,
      region_id: ctx.region_id, lob_id: ctx.lob_id, period_type: period.period_type
    }, period.start_date);
  }

  const fields = [];
  if (strategy.supportsDenominator) {
    fields.push({
      key: 'numerator', label: metric.numerator_label || 'Numerator',
      type: 'number', required: !!metric.requires_denominator,
      hint: metric.definition ? 'From: ' + metric.definition : ''
    });
    fields.push({
      key: 'denominator', label: metric.denominator_label || 'Denominator',
      type: 'number', required: !!metric.requires_denominator,
      hint: 'Sample size behind this value. Used to weight every rollup.'
    });
  }
  fields.push({
    key: 'value',
    label: 'Value' + (metric.unit === UNIT.PERCENT ? ' (%)' :
                      metric.unit === UNIT.SECONDS ? ' (seconds)' : ''),
    type: 'number',
    required: !strategy.supportsDenominator,
    readonly: !!metric.requires_denominator,
    hint: metric.requires_denominator
      ? 'Calculated from the numerator and denominator.'
      : '',
    min: metric.valid_min != null ? metric.valid_min : strategy.validRange.min,
    max: metric.valid_max != null ? metric.valid_max : strategy.validRange.max
  });
  fields.push({ key: 'comments', label: 'Comments', type: 'textarea', required: false });

  return {
    metric: Dashboard.publicMetric(metric),
    fields: fields,
    target: target,
    strategy: {
      supportsDenominator: strategy.supportsDenominator,
      deltaUnit: strategy.deltaUnit,
      validRange: strategy.validRange
    },
    existing: period && p.subject_id ? existingValue(p, metric, period) : null
  };
}

/** Warn the form when a value already exists — resubmitting supersedes it. */
function existingValue(p, metric, period) {
  const key = Facts.keyFor(p.subject_type, p.subject_id, metric.metric_id,
                           period.period_id, metric.instrument);
  const year = Number(period.start_date.slice(0, 4));
  const hit = Repository.where(TABLE.FACT, function (f) {
    return f.idempotency_key === key;
  }, year)[0];
  if (!hit) return null;
  return {
    fact_id: hit.fact_id, value: hit.value,
    numerator: hit.numerator, denominator: hit.denominator,
    comments: hit.comments, updated_at: hit.updated_at, updated_by: hit.updated_by,
    display: formatValue(hit.value, metric.unit, metric.decimal_places)
  };
}
