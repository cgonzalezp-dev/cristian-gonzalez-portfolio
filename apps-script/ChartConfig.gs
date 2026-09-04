/**
 * ChartConfig.gs
 * -----------------------------------------------------------------------------
 * Saved chart definitions, and assembling the data a chart needs to render.
 *
 * The title is the user's, not the system's. A metric may be called
 * "Quality @ Uber - Experience" in the registry while its chart is titled
 * "Customer Experience Quality" — the technical name is never forced into the
 * presentation layer. Title, subtitle, description and footer are all free text.
 */

const ChartConfig = (function () {

  function list(dashboardId) {
    const rows = Repository.readAll(TABLE.CHART)
      .filter(function (c) { return c.status === RECORD_STATUS.ACTIVE; });
    return (dashboardId
        ? rows.filter(function (c) { return c.dashboard_id === dashboardId; })
        : rows)
      .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
  }

  function save(input) {
    return withLock(function () {
      const now = nowIso(), user = Auth.currentUser();
      const title = str(input.chart_title).trim();
      if (!title) throw new AppError('VALIDATION', 'Give the chart a title.');
      if (!CHART_TYPE[str(input.chart_type)]) {
        throw new AppError('VALIDATION', 'Choose a chart type.');
      }
      const metricIds = Array.isArray(input.metric_ids) ? input.metric_ids : [];
      if (!metricIds.length) {
        throw new AppError('VALIDATION', 'Select at least one metric to display.');
      }

      const rec = {
        chart_id: input.chart_id || uid('cht'),
        chart_title: title,
        subtitle: str(input.subtitle),
        description: str(input.description),
        footer: str(input.footer),
        chart_type: str(input.chart_type),
        metric_ids: metricIds,
        lob_ids: Array.isArray(input.lob_ids) ? input.lob_ids : [],
        subject_type: str(input.subject_type) || SUBJECT_TYPE.LOB,
        period_type: str(input.period_type) || PERIOD_TYPE.WEEKLY,
        period_count: num(input.period_count) || 12,
        x_axis_label: str(input.x_axis_label),
        y_axis_label: str(input.y_axis_label),
        y_min: num(input.y_min),
        y_max: num(input.y_max),
        show_target_line: input.show_target_line === undefined ? true
                                                              : bool(input.show_target_line),
        show_benchmark: bool(input.show_benchmark),
        benchmark_subject_type: str(input.benchmark_subject_type),
        benchmark_subject_id: str(input.benchmark_subject_id),
        show_data_labels: bool(input.show_data_labels),
        show_percentage: input.show_percentage === undefined ? true
                                                             : bool(input.show_percentage),
        show_absolute: bool(input.show_absolute),
        comparison_period: str(input.comparison_period) || COMPARISON.VS_PRIOR_PERIOD,
        dashboard_id: str(input.dashboard_id) || 'default',
        sort_order: num(input.sort_order) || list().length + 1,
        width: str(input.width) || 'half',
        status: RECORD_STATUS.ACTIVE,
        updated_at: now, updated_by: user
      };

      if (input.chart_id) {
        const before = Repository.findById(TABLE.CHART, input.chart_id);
        if (!before) throw new AppError('NOT_FOUND', 'Chart not found.');
        Repository.update(TABLE.CHART, input.chart_id, rec);
        ConfigService.audit(TABLE.CHART, rec.chart_id, 'UPDATE', 'chart_title',
                            before.chart_title, title);
      } else {
        rec.created_at = now;
        rec.created_by = user;
        Repository.insert(TABLE.CHART, rec);
        ConfigService.audit(TABLE.CHART, rec.chart_id, 'CREATE', 'chart_title', '', title);
      }
      Cache.invalidate();
      return rec;
    });
  }

  function setStatus(chartId, status) {
    return withLock(function () {
      Repository.update(TABLE.CHART, chartId, { status: status, updated_at: nowIso() });
      ConfigService.audit(TABLE.CHART, chartId,
        status === RECORD_STATUS.ACTIVE ? 'REACTIVATE' : 'DEACTIVATE', 'status', '', status);
      Cache.invalidate();
      return true;
    });
  }

  /**
   * Assemble everything the renderer needs for one chart.
   *
   * Returns series in a single shape regardless of chart type, so the SVG
   * renderer has one code path: {labels, series:[{name, points, target, meta}]}.
   *
   * @param {!Object} chart config_chart row
   * @param {!Object=} overrides runtime filter overrides from the dashboard bar
   */
  function render(chart, overrides) {
    const o = overrides || {};
    const periodType = o.period_type || chart.period_type;
    const periodCount = num(o.period_count) || chart.period_count || 12;
    const metricIds = (o.metric_ids && o.metric_ids.length) ? o.metric_ids : chart.metric_ids;
    const lobIds = (o.lob_ids && o.lob_ids.length) ? o.lob_ids : chart.lob_ids;

    const periods = PeriodEngine.latest(periodType, periodCount);
    const labels = periods.map(function (p) { return p.period_label; });

    const series = [];
    let primaryMetric = null;

    metricIds.forEach(function (metricId) {
      const metric = ConfigService.getMetric(metricId);
      if (!primaryMetric) primaryMetric = metric;

      // A chart with no LOB filter shows the global series; with LOBs, one
      // series per LOB so they can be compared directly.
      const subjects = lobIds && lobIds.length
        ? lobIds.map(function (id) { return { type: SUBJECT_TYPE.LOB, id: id }; })
        : [{ type: chart.subject_type || SUBJECT_TYPE.GLOBAL, id: '' }];

      const names = Dashboard.subjectNameMap(SUBJECT_TYPE.LOB);

      subjects.forEach(function (subject) {
        const s = Dashboard.metricSeries({
          metric_id: metricId,
          subject_type: subject.type,
          subject_id: subject.id,
          period_type: periodType,
          period_count: periodCount
        });

        const label = (metricIds.length > 1 ? (metric.display_name || metric.metric_name) : '') +
                      (metricIds.length > 1 && subject.id ? ' — ' : '') +
                      (subject.id ? (names[subject.id] || subject.id) : '') ||
                      (metric.display_name || metric.metric_name);

        series.push({
          name: label,
          metric_id: metricId,
          unit: metric.unit,
          decimal_places: metric.decimal_places,
          direction: metric.direction_of_success,
          points: s.series.map(function (p) {
            return {
              label: p.period_label,
              value: p.value,
              display: p.display,
              status: p.status,
              n: p.observation_count,
              weighted: p.is_weighted,
              missing: p.missing
            };
          }),
          target: chart.show_target_line ? targetLine(s.series) : null,
          current: s.current,
          vs_prior: s.vs_prior,
          vs_target: s.vs_target,
          trend: s.trend
        });
      });
    });

    // Benchmark overlay — a cohort or peer series drawn as a reference line.
    // Rendered visually distinct from the target, because they are different
    // things: a target is a goal, a benchmark is somebody else's actual.
    let benchmark = null;
    if (chart.show_benchmark && chart.benchmark_subject_id && primaryMetric) {
      const b = Dashboard.metricSeries({
        metric_id: primaryMetric.metric_id,
        subject_type: chart.benchmark_subject_type || SUBJECT_TYPE.COHORT,
        subject_id: chart.benchmark_subject_id,
        period_type: periodType,
        period_count: periodCount
      });
      const names = Dashboard.subjectNameMap(chart.benchmark_subject_type ||
                                             SUBJECT_TYPE.COHORT);
      benchmark = {
        name: names[chart.benchmark_subject_id] || 'Benchmark',
        points: b.series.map(function (p) { return p.value; })
      };
    }

    return {
      chart: {
        chart_id: chart.chart_id,
        title: chart.chart_title,
        subtitle: chart.subtitle,
        description: chart.description,
        footer: chart.footer,
        chart_type: chart.chart_type,
        x_axis_label: chart.x_axis_label,
        y_axis_label: chart.y_axis_label,
        y_min: chart.y_min,
        y_max: chart.y_max,
        show_data_labels: chart.show_data_labels,
        show_target_line: chart.show_target_line,
        width: chart.width
      },
      labels: labels,
      series: series,
      benchmark: benchmark,
      metric: primaryMetric ? Dashboard.publicMetric(primaryMetric) : null,
      empty: !series.some(function (s) {
        return s.points.some(function (p) { return p.value != null; });
      })
    };
  }

  /** The target line, when it is constant across the window. */
  function targetLine(series) {
    const targets = unique(series.map(function (p) { return p.target; })
                                 .filter(function (t) { return t != null; }));
    if (!targets.length) return null;
    if (targets.length === 1) return { constant: targets[0] };
    // An effective-dated target changed mid-window: draw it as a step, which is
    // the honest rendering — the goal genuinely moved.
    return { steps: series.map(function (p) { return p.target; }) };
  }

  /** Render every chart on a dashboard in one call. */
  function renderDashboard(dashboardId, overrides) {
    return list(dashboardId || 'default').map(function (chart) {
      try {
        return render(chart, overrides);
      } catch (e) {
        Log.error('renderChart:' + chart.chart_id, e);
        return {
          chart: { chart_id: chart.chart_id, title: chart.chart_title,
                   chart_type: chart.chart_type, width: chart.width },
          labels: [], series: [], empty: true,
          error: 'This chart could not be built. Check its configuration.'
        };
      }
    });
  }

  return {
    list: list, save: save, setStatus: setStatus,
    render: render, renderDashboard: renderDashboard
  };
})();
