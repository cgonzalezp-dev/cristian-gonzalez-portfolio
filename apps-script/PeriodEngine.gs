/**
 * PeriodEngine.gs
 * -----------------------------------------------------------------------------
 * Reporting periods: creation, ordering, and "what came before this?".
 *
 * Three rules make user-defined labels safe:
 *
 *   1. THE LABEL IS PRESERVED VERBATIM. "Week 31", "Week 31 - July", "August W1",
 *      "Q3 W1" — whatever is typed is what is displayed, forever. The system
 *      never rewrites it.
 *
 *   2. ORDERING IS ALWAYS BY start_date, NEVER BY LABEL. "Week 31" string-sorts
 *      before "Week 4", and "August W1" does not sort at all. Every chart axis,
 *      every pivot column and every trend derives its order from dates.
 *
 *   3. "PREVIOUS PERIOD" IS THE NEAREST EARLIER START DATE of the same type and
 *      calendar — not week_number minus one. Decrementing the number breaks at
 *      year boundaries, breaks on custom labels, and silently compares across a
 *      gap when a week was skipped.
 */

const PeriodEngine = (function () {

  function all(calendarId) {
    const rows = Cache.remember('periods', function () {
      return Repository.readAll(TABLE.PERIOD);
    });
    return rows
      .filter(function (p) {
        return p.status === RECORD_STATUS.ACTIVE &&
               (!calendarId || p.calendar_id === calendarId);
      })
      .sort(bySortKey);
  }

  function bySortKey(a, b) {
    return String(a.sort_key).localeCompare(String(b.sort_key));
  }

  function get(periodId) {
    const p = all().filter(function (x) { return x.period_id === periodId; })[0];
    if (!p) throw new AppError('NOT_FOUND', 'Reporting period not found.');
    return p;
  }

  function listByType(periodType, calendarId) {
    return all(calendarId).filter(function (p) { return p.period_type === periodType; });
  }

  /**
   * Create or update a period.
   *
   * @param {{period_id, period_type, period_label, start_date, end_date,
   *          calendar_id, week_number}} input
   */
  function save(input) {
    return withLock(function () {
      const periodType = str(input.period_type);
      if (!PERIOD_TYPE[periodType]) {
        throw new AppError('VALIDATION', 'Choose a reporting frequency.');
      }
      const label = str(input.period_label).trim();
      if (!label) throw new AppError('VALIDATION', 'A period needs a label.');

      const start = toDateStr(input.start_date);
      const end = toDateStr(input.end_date);
      if (!start || !end) {
        throw new AppError('VALIDATION', 'A period needs both a start and an end date.');
      }
      if (end < start) {
        throw new AppError('VALIDATION', 'The end date cannot be before the start date.');
      }

      const calendarId = str(input.calendar_id) || 'default';
      assertNoOverlap(periodType, calendarId, start, end, input.period_id);

      const rec = {
        period_id: input.period_id || uid('per'),
        period_type: periodType,
        period_label: label,                    // verbatim, never regenerated
        start_date: start,
        end_date: end,
        sort_key: start,                        // rule 2
        year: Number(start.slice(0, 4)),
        quarter: quarterOf(start),
        month: Number(start.slice(5, 7)),
        week_number: num(input.week_number) != null ? num(input.week_number)
                                                    : isoWeekNumber(start),
        calendar_id: calendarId,
        is_closed: bool(input.is_closed),
        status: RECORD_STATUS.ACTIVE,
        created_at: nowIso(),
        created_by: Auth.currentUser()
      };

      if (input.period_id) {
        const before = Repository.findById(TABLE.PERIOD, input.period_id);
        if (!before) throw new AppError('NOT_FOUND', 'Reporting period not found.');
        delete rec.created_at;
        delete rec.created_by;
        Repository.update(TABLE.PERIOD, input.period_id, rec);
        ConfigService.audit(TABLE.PERIOD, input.period_id, 'UPDATE', 'period_label',
                            before.period_label, label);
      } else {
        Repository.insert(TABLE.PERIOD, rec);
        ConfigService.audit(TABLE.PERIOD, rec.period_id, 'CREATE', 'period_label', '', label);
      }
      Cache.invalidate();
      return rec;
    });
  }

  /**
   * Two periods of the same type covering the same day would double-count every
   * rollup that touches them. Blocked at entry rather than debugged later.
   */
  function assertNoOverlap(periodType, calendarId, start, end, excludeId) {
    const clash = all(calendarId).filter(function (p) {
      if (p.period_type !== periodType) return false;
      if (excludeId && p.period_id === excludeId) return false;
      return start <= p.end_date && end >= p.start_date;
    });
    if (clash.length) {
      throw new AppError('VALIDATION',
        'That date range overlaps "' + clash[0].period_label + '" (' +
        clash[0].start_date + ' to ' + clash[0].end_date +
        '). Two periods of the same frequency cannot cover the same day.');
    }
  }

  function setStatus(periodId, status) {
    return withLock(function () {
      Repository.update(TABLE.PERIOD, periodId, { status: status });
      ConfigService.audit(TABLE.PERIOD, periodId,
        status === RECORD_STATUS.ACTIVE ? 'REACTIVATE' : 'DEACTIVATE', 'status', '', status);
      Cache.invalidate();
      return true;
    });
  }

  /**
   * The period immediately before this one. Rule 3.
   * @return {?Object}
   */
  function previous(period) {
    const siblings = all(period.calendar_id)
      .filter(function (p) {
        return p.period_type === period.period_type && p.sort_key < period.sort_key;
      });
    return siblings.length ? siblings[siblings.length - 1] : null;
  }

  /** The N periods up to and including `period`, oldest first. */
  function trailing(period, count) {
    const siblings = all(period.calendar_id)
      .filter(function (p) {
        return p.period_type === period.period_type && p.sort_key <= period.sort_key;
      });
    return siblings.slice(Math.max(0, siblings.length - count));
  }

  /** The most recent N periods of a type, oldest first. */
  function latest(periodType, count, calendarId) {
    const rows = listByType(periodType, calendarId);
    return rows.slice(Math.max(0, rows.length - (count || 12)));
  }

  /** Same period one year earlier, matched on nearest start date. */
  function samePeriodLastYear(period) {
    const wanted = addDays(period.start_date, -364);
    const siblings = all(period.calendar_id)
      .filter(function (p) { return p.period_type === period.period_type; });
    let best = null, bestGap = Infinity;
    siblings.forEach(function (p) {
      const gap = Math.abs(daysBetween(wanted, p.start_date));
      if (gap < bestGap) { bestGap = gap; best = p; }
    });
    return bestGap <= 10 ? best : null;
  }

  /**
   * Generate a run of periods for quick setup. The labels produced here are
   * suggestions written into normal editable rows — nothing about them is
   * special, and any of them can be renamed afterwards.
   *
   * @param {{period_type, start_date, count, label_pattern, calendar_id}} spec
   *        label_pattern supports {n} {week} {year} {month} {quarter} {start} {end}
   * @return {!Array<!Object>} generated periods
   */
  function generate(spec) {
    const type = str(spec.period_type);
    const count = Math.min(num(spec.count) || 12, 260);
    const calendarId = str(spec.calendar_id) || 'default';
    let cursor = toDateStr(spec.start_date);
    if (!cursor) throw new AppError('VALIDATION', 'Choose a start date.');

    const created = [];
    for (let i = 0; i < count; i++) {
      const span = spanFor(type, cursor);
      const label = renderLabel(spec.label_pattern, type, span, i);
      try {
        created.push(save({
          period_type: type,
          period_label: label,
          start_date: span.start,
          end_date: span.end,
          calendar_id: calendarId,
          week_number: isoWeekNumber(span.start)
        }));
      } catch (e) {
        // An overlap here means the period already exists — skip and continue,
        // so re-running generation is safe.
        if (!(e instanceof AppError)) throw e;
      }
      cursor = addDays(span.end, 1);
    }
    return created;
  }

  function spanFor(type, startDate) {
    const d = parseDateStr(startDate);
    switch (type) {
      case PERIOD_TYPE.DAILY:
        return { start: startDate, end: startDate };
      case PERIOD_TYPE.WEEKLY:
        return { start: startDate, end: addDays(startDate, 6) };
      case PERIOD_TYPE.MONTHLY: {
        const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
        return { start: startDate, end: Utilities.formatDate(end, 'UTC', 'yyyy-MM-dd') };
      }
      case PERIOD_TYPE.QUARTERLY: {
        const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 0));
        return { start: startDate, end: Utilities.formatDate(end, 'UTC', 'yyyy-MM-dd') };
      }
      case PERIOD_TYPE.YEARLY: {
        const end = new Date(Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), 0));
        return { start: startDate, end: Utilities.formatDate(end, 'UTC', 'yyyy-MM-dd') };
      }
      default:
        return { start: startDate, end: addDays(startDate, 6) };
    }
  }

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

  function renderLabel(pattern, type, span, index) {
    const year = span.start.slice(0, 4);
    const monthIdx = Number(span.start.slice(5, 7)) - 1;
    const week = isoWeekNumber(span.start);
    const quarter = quarterOf(span.start);

    const p = str(pattern) || defaultPattern(type);
    return p
      .replace(/\{n\}/g, String(index + 1))
      .replace(/\{week\}/g, String(week))
      .replace(/\{year\}/g, year)
      .replace(/\{month\}/g, MONTHS[monthIdx])
      .replace(/\{quarter\}/g, 'Q' + quarter)
      .replace(/\{start\}/g, span.start)
      .replace(/\{end\}/g, span.end);
  }

  function defaultPattern(type) {
    switch (type) {
      case PERIOD_TYPE.DAILY:     return '{start}';
      case PERIOD_TYPE.WEEKLY:    return 'Week {week}';
      case PERIOD_TYPE.MONTHLY:   return '{month} {year}';
      case PERIOD_TYPE.QUARTERLY: return '{quarter} {year}';
      case PERIOD_TYPE.YEARLY:    return '{year}';
      default:                    return 'Period {n}';
    }
  }

  /**
   * Periods where a subject has no value for a metric — the "missing periods"
   * data-quality check. Only looks between the first and last period that DO
   * have data, so a newly onboarded agent isn't flagged for the whole year.
   * @return {!Array<!Object>}
   */
  function missingWithin(periodType, presentPeriodIds, calendarId) {
    const present = {};
    presentPeriodIds.forEach(function (id) { present[id] = true; });
    const series = listByType(periodType, calendarId);
    const covered = series.filter(function (p) { return present[p.period_id]; });
    if (covered.length < 2) return [];
    const first = covered[0].sort_key;
    const last = covered[covered.length - 1].sort_key;
    return series.filter(function (p) {
      return p.sort_key >= first && p.sort_key <= last && !present[p.period_id];
    });
  }

  return {
    all: all, get: get, listByType: listByType, save: save, setStatus: setStatus,
    previous: previous, trailing: trailing, latest: latest,
    samePeriodLastYear: samePeriodLastYear,
    generate: generate, missingWithin: missingWithin, bySortKey: bySortKey
  };
})();
