/**
 * Facts.gs
 * -----------------------------------------------------------------------------
 * Writing and reading measured values.
 *
 * Every write is idempotent. Sheets has no unique constraint, so the same
 * logical submission always hashes to the same idempotency_key; a resubmission
 * supersedes the previous row instead of quietly creating a second truth for
 * the same subject/metric/period.
 */

const Facts = (function () {

  /**
   * Compute the idempotency key for a logical measurement.
   * Instrument is part of the key: an operational CSAT and a survey CSAT for the
   * same team and week are different measurements, not a duplicate.
   */
  function keyFor(subjectType, subjectId, metricId, periodId, instrument) {
    return hashKey([subjectType, subjectId, metricId, periodId, instrument || '']);
  }

  /**
   * Submit one measurement.
   * @param {!Object} input
   * @return {{fact: !Object, warnings: !Array, superseded: boolean}}
   */
  function submit(input) {
    const metric = ConfigService.getMetric(str(input.metric_id));
    const period = PeriodEngine.get(str(input.period_id));

    const check = Validation.validateEntry(input, metric, period);
    if (check.errors.length) {
      throw new AppError('VALIDATION', check.errors[0], { errors: check.errors });
    }

    const ctx = resolveSubjectContext(input.subject_type, input.subject_id);
    const target = ConfigService.resolveTarget(metric.metric_id, {
      agent_id: ctx.agent_id, manager_id: ctx.manager_id, team_id: ctx.team_id,
      region_id: ctx.region_id, lob_id: ctx.lob_id, period_type: period.period_type
    }, period.start_date);

    const history = readSeries({
      subject_type: input.subject_type, subject_id: input.subject_id,
      metric_id: metric.metric_id, period_type: period.period_type
    }).filter(function (h) { return h.period_id !== period.period_id; });

    const warnings = check.warnings.concat(
      Validation.historicalChecks({ value: check.value }, metric, history));

    return withLock(function () {
      const idemKey = keyFor(input.subject_type, input.subject_id,
                             metric.metric_id, period.period_id, metric.instrument);
      const year = Number(period.start_date.slice(0, 4));
      const existing = Repository.where(TABLE.FACT, function (f) {
        return f.idempotency_key === idemKey;
      }, year)[0];

      const now = nowIso(), user = Auth.currentUser();
      const record = {
        idempotency_key: idemKey,
        subject_type: input.subject_type,
        subject_id: str(input.subject_id),
        lob_id: ctx.lob_id, team_id: ctx.team_id,
        manager_id: ctx.manager_id, region_id: ctx.region_id,
        metric_id: metric.metric_id,
        period_id: period.period_id,
        period_type: period.period_type,
        period_start: period.start_date,
        numerator: check.numerator,
        denominator: check.denominator,
        value: check.value,
        target_snapshot: target ? target.target_value : null,
        target_id_snapshot: target ? target.target_id : '',
        unit_snapshot: metric.unit,
        source: str(input.source) || SOURCE.ENTRY,
        entry_status: str(input.entry_status) || ENTRY_STATUS.SUBMITTED,
        quality_flags: warnings,
        comments: str(input.comments),
        updated_at: now, updated_by: user
      };

      let fact, superseded = false;
      if (existing) {
        record.fact_id = existing.fact_id;
        record.created_at = existing.created_at;
        record.created_by = existing.created_by;
        record.version = (existing.version || 1) + 1;
        fact = Repository.update(TABLE.FACT, existing.fact_id, record, year);
        superseded = true;
        ConfigService.audit(TABLE.FACT, existing.fact_id, 'UPDATE', 'value',
                            existing.value, record.value);
      } else {
        record.fact_id = uid('fct');
        record.created_at = now;
        record.created_by = user;
        record.version = 1;
        Repository.insert(TABLE.FACT, record, year);
        fact = record;
        ConfigService.audit(TABLE.FACT, record.fact_id, 'CREATE', 'value', '', record.value);
      }

      // Incremental materialisation: recompute only the slices this write
      // touched. A full rebuild would blow the 6-minute ceiling.
      try {
        MaterializedViews.refreshSlice(metric.metric_id, period.period_id, ctx);
      } catch (e) {
        Log.error('refreshSlice', e);
      }

      return { fact: fact, warnings: warnings, superseded: superseded };
    });
  }

  /**
   * Submit many measurements in one pass (the bulk grid).
   * Rows are validated individually; valid rows are written even when others
   * fail, and the caller receives a per-row result so the grid can highlight
   * exactly which cells need attention.
   */
  function submitBatch(rows) {
    const results = [];
    for (let i = 0; i < rows.length; i++) {
      try {
        const r = submit(rows[i]);
        results.push({ index: i, ok: true, warnings: r.warnings, superseded: r.superseded });
      } catch (e) {
        results.push({
          index: i, ok: false,
          error: e.userFacing ? e.message : 'Could not save this row.'
        });
        if (!e.userFacing) Log.error('submitBatch', e);
      }
    }
    return {
      total: rows.length,
      saved: results.filter(function (r) { return r.ok; }).length,
      failed: results.filter(function (r) { return !r.ok; }).length,
      results: results
    };
  }

  /**
   * Which years a query needs to touch, so we never read partitions pointlessly.
   * @return {!Array<number>}
   */
  function yearsFor(filters) {
    const available = Repository.factPartitions();
    if (!available.length) return [];
    if (filters.period_ids && filters.period_ids.length) {
      const years = {};
      PeriodEngine.all().forEach(function (p) {
        if (filters.period_ids.indexOf(p.period_id) >= 0) {
          years[Number(p.start_date.slice(0, 4))] = true;
        }
      });
      const wanted = Object.keys(years).map(Number);
      return wanted.length ? available.filter(function (y) { return wanted.indexOf(y) >= 0; })
                           : available;
    }
    if (filters.date_from || filters.date_to) {
      const from = filters.date_from ? Number(toDateStr(filters.date_from).slice(0, 4)) : -Infinity;
      const to = filters.date_to ? Number(toDateStr(filters.date_to).slice(0, 4)) : Infinity;
      return available.filter(function (y) { return y >= from && y <= to; });
    }
    return available;
  }

  /**
   * Query facts.
   * @param {!Object} filters {metric_id(s), lob_id(s), subject_type, subject_id(s),
   *                           period_type, period_ids, date_from, date_to,
   *                           manager_id, team_id, region_id}
   * @return {!Array<!Object>} sorted oldest-first by period_start
   */
  function query(filters) {
    const f = filters || {};
    const years = yearsFor(f);
    if (!years.length) return [];

    const inList = function (value, list) {
      if (!list || (Array.isArray(list) && !list.length)) return true;
      const arr = Array.isArray(list) ? list : [list];
      return arr.indexOf(value) >= 0;
    };

    const rows = Repository.readFactYears(years).filter(function (r) {
      if (!inList(r.metric_id, f.metric_id || f.metric_ids)) return false;
      if (!inList(r.lob_id, f.lob_id || f.lob_ids)) return false;
      if (f.subject_type && r.subject_type !== f.subject_type) return false;
      if (!inList(r.subject_id, f.subject_id || f.subject_ids)) return false;
      if (f.period_type && r.period_type !== f.period_type) return false;
      if (!inList(r.period_id, f.period_ids)) return false;
      if (!inList(r.manager_id, f.manager_id || f.manager_ids)) return false;
      if (!inList(r.team_id, f.team_id || f.team_ids)) return false;
      if (!inList(r.region_id, f.region_id || f.region_ids)) return false;
      if (f.date_from && r.period_start < toDateStr(f.date_from)) return false;
      if (f.date_to && r.period_start > toDateStr(f.date_to)) return false;
      if (f.entry_status && r.entry_status !== f.entry_status) return false;
      return true;
    });

    rows.sort(function (a, b) {
      return String(a.period_start).localeCompare(String(b.period_start));
    });
    return rows;
  }

  /** One subject's time series for one metric. */
  function readSeries(filters) {
    return query({
      subject_type: filters.subject_type,
      subject_id: filters.subject_id,
      metric_id: filters.metric_id,
      period_type: filters.period_type
    });
  }

  /**
   * Denormalise the org context for a subject so fact rows can be filtered by
   * manager/team/region without a join at read time.
   */
  function resolveSubjectContext(subjectType, subjectId) {
    const empty = { lob_id: '', team_id: '', manager_id: '', region_id: '', agent_id: '' };
    if (!subjectId) return empty;

    switch (subjectType) {
      case SUBJECT_TYPE.AGENT: {
        const a = Repository.findById(TABLE.AGENT, subjectId);
        if (!a) return empty;
        return { lob_id: a.lob_id, team_id: a.team_id, manager_id: a.manager_id,
                 region_id: a.region_id, agent_id: a.agent_id };
      }
      case SUBJECT_TYPE.TEAM: {
        const t = Repository.findById(TABLE.TEAM, subjectId);
        if (!t) return empty;
        return { lob_id: t.lob_id, team_id: t.team_id, manager_id: t.manager_id,
                 region_id: '', agent_id: '' };
      }
      case SUBJECT_TYPE.MANAGER: {
        const m = Repository.findById(TABLE.MANAGER, subjectId);
        if (!m) return empty;
        return { lob_id: m.lob_id, team_id: '', manager_id: m.manager_id,
                 region_id: m.region_id, agent_id: '' };
      }
      case SUBJECT_TYPE.LOB:
        return { lob_id: subjectId, team_id: '', manager_id: '', region_id: '', agent_id: '' };
      case SUBJECT_TYPE.REGION:
        return { lob_id: '', team_id: '', manager_id: '', region_id: subjectId, agent_id: '' };
      default:
        return empty;
    }
  }

  /** Delete a fact (admin only) — used for genuinely erroneous entries. */
  function remove(factId, year) {
    return withLock(function () {
      const removed = Repository.deleteWhere(TABLE.FACT, function (f) {
        return f.fact_id === factId;
      }, year);
      if (removed) ConfigService.audit(TABLE.FACT, factId, 'DELETE', '', '', '');
      return removed > 0;
    });
  }

  return {
    submit: submit, submitBatch: submitBatch, query: query, readSeries: readSeries,
    keyFor: keyFor, resolveSubjectContext: resolveSubjectContext, remove: remove
  };
})();
