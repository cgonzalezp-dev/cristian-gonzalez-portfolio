/**
 * ConfigService.gs
 * -----------------------------------------------------------------------------
 * CRUD and resolution for everything the user configures: LOBs, metrics,
 * targets, charts, dimensions, settings.
 *
 * Two rules enforced throughout:
 *   1. SOFT DELETE ONLY. Deactivating an LOB or metric never removes history —
 *      it stops the entity appearing in pickers. Dashboards handle "inactive
 *      but has history" explicitly rather than losing the data.
 *   2. IDs ARE IMMUTABLE. Renaming is free because nothing references a name.
 */

const ConfigService = (function () {

  // ------------------------------------------------------------- settings

  function allSettings() {
    return Cache.remember('settings', function () {
      const rows = Repository.readAll(TABLE.SETTINGS);
      const out = {};
      rows.forEach(function (r) {
        out[r.setting_key] = castSetting(r.setting_value, r.value_type);
      });
      // Anything never persisted falls back to the shipped default.
      Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
        if (out[k] === undefined) out[k] = DEFAULT_SETTINGS[k];
      });
      return out;
    });
  }

  function castSetting(raw, type) {
    switch (type) {
      case 'number':  return num(raw);
      case 'boolean': return bool(raw);
      case 'json':    return parseJson(raw, null);
      default:        return str(raw);
    }
  }

  function getSetting(key) {
    const v = allSettings()[key];
    return v === undefined ? DEFAULT_SETTINGS[key] : v;
  }

  function setSetting(key, value) {
    return withLock(function () {
      const type = typeof value === 'number' ? 'number'
                 : typeof value === 'boolean' ? 'boolean'
                 : typeof value === 'object' ? 'json' : 'string';
      const raw = type === 'json' ? JSON.stringify(value) : String(value);
      const existing = Repository.findById(TABLE.SETTINGS, key);
      const patch = {
        setting_key: key, setting_value: raw, value_type: type,
        updated_at: nowIso(), updated_by: Auth.currentUser()
      };
      if (existing) Repository.update(TABLE.SETTINGS, key, patch);
      else Repository.insert(TABLE.SETTINGS, patch);
      audit(TABLE.SETTINGS, key, 'UPDATE', key,
            existing ? existing.setting_value : '', raw);
      Cache.invalidate();
      return getSetting(key);
    });
  }

  // ------------------------------------------------------------------ LOB

  function listLobs(includeInactive) {
    const rows = Cache.remember('lobs', function () {
      return Repository.readAll(TABLE.LOB);
    });
    return rows
      .filter(function (r) { return includeInactive || r.status === RECORD_STATUS.ACTIVE; })
      .sort(function (a, b) {
        return (a.sort_order || 0) - (b.sort_order || 0) ||
               a.lob_name.localeCompare(b.lob_name);
      });
  }

  function saveLob(input) {
    return withLock(function () {
      const now = nowIso(), user = Auth.currentUser();
      if (input.lob_id) {
        const before = Repository.findById(TABLE.LOB, input.lob_id);
        if (!before) throw new AppError('NOT_FOUND', 'Line of business not found.');
        if (input.lob_name) {
          assertUniqueName(TABLE.LOB, 'lob_name', input.lob_name, input.lob_id,
                           'A line of business with that name already exists.');
        }
        const patch = {
          lob_name: str(input.lob_name) || before.lob_name,
          description: str(input.description),
          parent_lob_id: str(input.parent_lob_id),
          sort_order: num(input.sort_order) || 0,
          status: input.status || before.status,
          updated_at: now, updated_by: user
        };
        const after = Repository.update(TABLE.LOB, input.lob_id, patch);
        auditDiff(TABLE.LOB, input.lob_id, before, patch);
        Cache.invalidate();
        return after;
      }
      assertUniqueName(TABLE.LOB, 'lob_name', input.lob_name, null,
                       'A line of business with that name already exists.');
      const rec = {
        lob_id: uid('lob'),
        lob_name: requireText(input.lob_name, 'Line of business name'),
        description: str(input.description),
        parent_lob_id: str(input.parent_lob_id),
        sort_order: num(input.sort_order) || listLobs(true).length + 1,
        status: RECORD_STATUS.ACTIVE,
        created_at: now, created_by: user, updated_at: now, updated_by: user
      };
      Repository.insert(TABLE.LOB, rec);
      audit(TABLE.LOB, rec.lob_id, 'CREATE', 'lob_name', '', rec.lob_name);
      Cache.invalidate();
      return rec;
    });
  }

  /** Soft delete / restore. History is never touched. */
  function setLobStatus(lobId, status) {
    return withLock(function () {
      const before = Repository.findById(TABLE.LOB, lobId);
      if (!before) throw new AppError('NOT_FOUND', 'Line of business not found.');
      Repository.update(TABLE.LOB, lobId,
        { status: status, updated_at: nowIso(), updated_by: Auth.currentUser() });
      audit(TABLE.LOB, lobId, status === RECORD_STATUS.ACTIVE ? 'REACTIVATE' : 'DEACTIVATE',
            'status', before.status, status);
      Cache.invalidate();
      return true;
    });
  }

  // --------------------------------------------------------------- metric

  function listMetrics(includeInactive) {
    const rows = Cache.remember('metrics', function () {
      return Repository.readAll(TABLE.METRIC);
    });
    return rows
      .filter(function (r) { return includeInactive || r.status === RECORD_STATUS.ACTIVE; })
      .sort(function (a, b) { return a.metric_name.localeCompare(b.metric_name); });
  }

  function getMetric(metricId) {
    const m = listMetrics(true).filter(function (r) { return r.metric_id === metricId; })[0];
    if (!m) throw new AppError('NOT_FOUND', 'Metric not found: ' + metricId);
    return m;
  }

  /** Metrics assigned to an LOB. Unassigned metrics are treated as global. */
  function metricsForLob(lobId, includeInactive) {
    const links = Repository.readAll(TABLE.METRIC_LOB)
      .filter(function (l) { return l.status === RECORD_STATUS.ACTIVE; });
    const linkedIds = {};
    const anyLinkFor = {};
    links.forEach(function (l) {
      anyLinkFor[l.metric_id] = true;
      if (l.lob_id === lobId) linkedIds[l.metric_id] = true;
    });
    return listMetrics(includeInactive).filter(function (m) {
      return !anyLinkFor[m.metric_id] || linkedIds[m.metric_id];
    });
  }

  function saveMetric(input) {
    return withLock(function () {
      const now = nowIso(), user = Auth.currentUser();
      const dataType = str(input.data_type);
      if (!DATA_TYPE[dataType]) {
        throw new AppError('VALIDATION', 'Choose a data type for this metric.');
      }
      if (!DIRECTION[str(input.direction_of_success)]) {
        throw new AppError('VALIDATION', 'Choose a direction of success.');
      }
      const strategy = MetricStrategy.catalogue()
        .filter(function (s) { return s.value === dataType; })[0];

      const fields = {
        metric_name: requireText(input.metric_name, 'Metric name'),
        display_name: str(input.display_name) || str(input.metric_name),
        description: str(input.description),
        definition: str(input.definition),
        category: str(input.category),
        data_type: dataType,
        unit: str(input.unit) || strategy.defaults.unit,
        decimal_places: num(input.decimal_places) != null
          ? num(input.decimal_places) : getSetting('default_decimal_places'),
        direction_of_success: str(input.direction_of_success),
        aggregation_rule: str(input.aggregation_rule) || strategy.defaults.aggregation_rule,
        weight_field: str(input.weight_field) || 'denominator',
        default_frequency: str(input.default_frequency) || PERIOD_TYPE.WEEKLY,
        valid_min: num(input.valid_min),
        valid_max: num(input.valid_max),
        requires_denominator: input.requires_denominator === undefined
          ? strategy.supportsDenominator : bool(input.requires_denominator),
        numerator_label: str(input.numerator_label),
        denominator_label: str(input.denominator_label),
        instrument: str(input.instrument),
        source_system: str(input.source_system),
        owner: str(input.owner),
        min_sample_observation: num(input.min_sample_observation) != null
          ? num(input.min_sample_observation) : getSetting('min_sample_observation'),
        min_sample_cross_sectional: num(input.min_sample_cross_sectional) != null
          ? num(input.min_sample_cross_sectional) : getSetting('min_sample_cross_sectional'),
        min_periods_control_chart: num(input.min_periods_control_chart) != null
          ? num(input.min_periods_control_chart) : getSetting('min_periods_control_chart'),
        updated_at: now, updated_by: user
      };

      let metricId = input.metric_id;
      if (metricId) {
        const before = Repository.findById(TABLE.METRIC, metricId);
        if (!before) throw new AppError('NOT_FOUND', 'Metric not found.');
        assertUniqueName(TABLE.METRIC, 'metric_name', fields.metric_name, metricId,
                         'A metric with that name already exists.');
        fields.status = input.status || before.status;
        Repository.update(TABLE.METRIC, metricId, fields);
        auditDiff(TABLE.METRIC, metricId, before, fields);
      } else {
        assertUniqueName(TABLE.METRIC, 'metric_name', fields.metric_name, null,
                         'A metric with that name already exists.');
        metricId = uid('met');
        fields.metric_id = metricId;
        fields.status = RECORD_STATUS.ACTIVE;
        fields.created_at = now;
        fields.created_by = user;
        Repository.insert(TABLE.METRIC, fields);
        audit(TABLE.METRIC, metricId, 'CREATE', 'metric_name', '', fields.metric_name);
      }

      if (Array.isArray(input.lob_ids)) assignMetricToLobs(metricId, input.lob_ids);
      Cache.invalidate();
      return getMetric(metricId);
    });
  }

  function assignMetricToLobs(metricId, lobIds) {
    Repository.deleteWhere(TABLE.METRIC_LOB, function (l) { return l.metric_id === metricId; });
    if (!lobIds.length) return;
    Repository.insertMany(TABLE.METRIC_LOB, lobIds.map(function (lobId) {
      return {
        metric_lob_id: uid('ml'), metric_id: metricId, lob_id: lobId,
        status: RECORD_STATUS.ACTIVE, created_at: nowIso(), created_by: Auth.currentUser()
      };
    }));
  }

  function lobIdsForMetric(metricId) {
    return Repository.readAll(TABLE.METRIC_LOB)
      .filter(function (l) {
        return l.metric_id === metricId && l.status === RECORD_STATUS.ACTIVE;
      })
      .map(function (l) { return l.lob_id; });
  }

  function setMetricStatus(metricId, status) {
    return withLock(function () {
      const before = Repository.findById(TABLE.METRIC, metricId);
      if (!before) throw new AppError('NOT_FOUND', 'Metric not found.');
      Repository.update(TABLE.METRIC, metricId,
        { status: status, updated_at: nowIso(), updated_by: Auth.currentUser() });
      audit(TABLE.METRIC, metricId,
            status === RECORD_STATUS.ACTIVE ? 'REACTIVATE' : 'DEACTIVATE',
            'status', before.status, status);
      Cache.invalidate();
      return true;
    });
  }

  // --------------------------------------------------------------- target

  function listTargets(metricId) {
    const rows = Repository.readAll(TABLE.TARGET)
      .filter(function (t) { return t.status === RECORD_STATUS.ACTIVE; });
    return metricId
      ? rows.filter(function (t) { return t.metric_id === metricId; })
      : rows;
  }

  function saveTarget(input) {
    return withLock(function () {
      const scope = str(input.scope_type) || TARGET_SCOPE.GLOBAL;
      if (!TARGET_SCOPE[scope]) throw new AppError('VALIDATION', 'Invalid target scope.');
      if (num(input.target_value) == null) {
        throw new AppError('VALIDATION', 'A target needs a value.');
      }
      const validFrom = toDateStr(input.valid_from) || toDateStr(new Date());

      const rec = {
        target_id: input.target_id || uid('tgt'),
        metric_id: requireText(input.metric_id, 'Metric'),
        scope_type: scope,
        scope_id: scope === TARGET_SCOPE.GLOBAL ? '' : str(input.scope_id),
        period_type: str(input.period_type),
        target_value: num(input.target_value),
        min_threshold: num(input.min_threshold),
        max_threshold: num(input.max_threshold),
        stretch_value: num(input.stretch_value),
        valid_from: validFrom,
        valid_to: toDateStr(input.valid_to),
        notes: str(input.notes),
        status: RECORD_STATUS.ACTIVE,
        created_at: nowIso(), created_by: Auth.currentUser()
      };

      if (input.target_id) {
        Repository.update(TABLE.TARGET, input.target_id, rec);
        audit(TABLE.TARGET, rec.target_id, 'UPDATE', 'target_value', '',
              String(rec.target_value));
      } else {
        // A new target supersedes the open-ended one it replaces rather than
        // overwriting it, so historical statuses stay evaluated against the
        // target that was actually in force at the time.
        closeOpenTarget(rec, validFrom);
        Repository.insert(TABLE.TARGET, rec);
        audit(TABLE.TARGET, rec.target_id, 'CREATE', 'target_value', '',
              String(rec.target_value));
      }
      Cache.invalidate();
      return rec;
    });
  }

  function closeOpenTarget(rec, newFrom) {
    const open = Repository.readAll(TABLE.TARGET).filter(function (t) {
      return t.status === RECORD_STATUS.ACTIVE &&
             t.metric_id === rec.metric_id &&
             t.scope_type === rec.scope_type &&
             t.scope_id === rec.scope_id &&
             t.period_type === rec.period_type &&
             !t.valid_to;
    });
    open.forEach(function (t) {
      Repository.update(TABLE.TARGET, t.target_id, { valid_to: addDays(newFrom, -1) });
    });
  }

  /**
   * Resolve the target in force for a metric, subject and date.
   *
   * Precedence is most-specific-first (AGENT → MANAGER → TEAM → REGION → LOB →
   * GLOBAL); within a scope, a target whose period_type matches beats a generic
   * one. The effective-date filter is what stops a target edit today from
   * silently rewriting last quarter's results.
   *
   * @param {string} metricId
   * @param {!Object} ctx {agent_id, manager_id, team_id, region_id, lob_id, period_type}
   * @param {string} onDate 'yyyy-MM-dd'
   * @return {?Object} {target_value, min_threshold, max_threshold, target_id, scope_type}
   */
  function resolveTarget(metricId, ctx, onDate) {
    const date = toDateStr(onDate) || toDateStr(new Date());
    const candidates = listTargets(metricId).filter(function (t) {
      if (t.valid_from && t.valid_from > date) return false;
      if (t.valid_to && t.valid_to < date) return false;
      return true;
    });
    if (!candidates.length) return null;

    const scopeIdFor = {};
    scopeIdFor[TARGET_SCOPE.AGENT] = ctx.agent_id;
    scopeIdFor[TARGET_SCOPE.MANAGER] = ctx.manager_id;
    scopeIdFor[TARGET_SCOPE.TEAM] = ctx.team_id;
    scopeIdFor[TARGET_SCOPE.REGION] = ctx.region_id;
    scopeIdFor[TARGET_SCOPE.LOB] = ctx.lob_id;
    scopeIdFor[TARGET_SCOPE.GLOBAL] = '';

    for (let i = 0; i < TARGET_PRECEDENCE.length; i++) {
      const scope = TARGET_PRECEDENCE[i];
      const wantId = scopeIdFor[scope];
      if (scope !== TARGET_SCOPE.GLOBAL && !wantId) continue;

      const atScope = candidates.filter(function (t) {
        return t.scope_type === scope && t.scope_id === (wantId || '');
      });
      if (!atScope.length) continue;

      // Period-specific beats generic; then most recently effective wins.
      const exact = atScope.filter(function (t) { return t.period_type === ctx.period_type; });
      const pool = exact.length ? exact
                                : atScope.filter(function (t) { return !t.period_type; });
      if (!pool.length) continue;

      pool.sort(function (a, b) { return (b.valid_from || '').localeCompare(a.valid_from || ''); });
      const hit = pool[0];
      return {
        target_id: hit.target_id,
        target_value: hit.target_value,
        min_threshold: hit.min_threshold,
        max_threshold: hit.max_threshold,
        stretch_value: hit.stretch_value,
        scope_type: hit.scope_type,
        valid_from: hit.valid_from,
        valid_to: hit.valid_to
      };
    }
    return null;
  }

  // ----------------------------------------------------------- dimensions

  function listDimension(table, includeInactive) {
    const rows = Cache.remember('dim:' + table, function () {
      return Repository.readAll(table);
    });
    return rows.filter(function (r) {
      return includeInactive || r.status === RECORD_STATUS.ACTIVE;
    });
  }

  function saveDimension(table, input, nameField) {
    return withLock(function () {
      const keyCol = schemaKey(table);
      const now = nowIso(), user = Auth.currentUser();
      const id = input[keyCol];
      const payload = {};
      schemaColumns(table).forEach(function (c) {
        if (Object.prototype.hasOwnProperty.call(input, c)) payload[c] = input[c];
      });
      if (id) {
        const before = Repository.findById(table, id);
        if (!before) throw new AppError('NOT_FOUND', 'Record not found.');
        payload.updated_at = now;
        payload.updated_by = user;
        delete payload.created_at;
        delete payload.created_by;
        Repository.update(table, id, payload);
        auditDiff(table, id, before, payload);
        Cache.invalidate();
        return Repository.findById(table, id);
      }
      payload[keyCol] = uid(table.split('_')[1] || 'rec');
      payload[nameField] = requireText(input[nameField], 'Name');
      payload.status = RECORD_STATUS.ACTIVE;
      payload.created_at = now;
      payload.created_by = user;
      Repository.insert(table, payload);
      audit(table, payload[keyCol], 'CREATE', nameField, '', payload[nameField]);
      Cache.invalidate();
      return payload;
    });
  }

  function setDimensionStatus(table, id, status) {
    return withLock(function () {
      const before = Repository.findById(table, id);
      if (!before) throw new AppError('NOT_FOUND', 'Record not found.');
      Repository.update(table, id, { status: status, updated_at: nowIso() });
      audit(table, id, status === RECORD_STATUS.ACTIVE ? 'REACTIVATE' : 'DEACTIVATE',
            'status', before.status, status);
      Cache.invalidate();
      return true;
    });
  }

  // ---------------------------------------------------------------- audit

  function audit(table, entityId, action, field, oldValue, newValue) {
    try {
      Repository.insert(TABLE.AUDIT, {
        audit_id: uid('aud'), entity_table: table, entity_id: entityId,
        action: action, field: field,
        old_value: String(oldValue == null ? '' : oldValue).slice(0, 500),
        new_value: String(newValue == null ? '' : newValue).slice(0, 500),
        actor: Auth.currentUser(), at: nowIso()
      });
    } catch (e) { Log.error('audit', e); }
  }

  /** Log only the fields that actually changed. */
  function auditDiff(table, entityId, before, patch) {
    const rows = [];
    Object.keys(patch).forEach(function (k) {
      if (k === 'updated_at' || k === 'updated_by') return;
      const oldV = before[k], newV = patch[k];
      if (String(oldV == null ? '' : oldV) === String(newV == null ? '' : newV)) return;
      rows.push({
        audit_id: uid('aud'), entity_table: table, entity_id: entityId,
        action: 'UPDATE', field: k,
        old_value: String(oldV == null ? '' : oldV).slice(0, 500),
        new_value: String(newV == null ? '' : newV).slice(0, 500),
        actor: Auth.currentUser(), at: nowIso()
      });
    });
    if (rows.length) {
      try { Repository.insertMany(TABLE.AUDIT, rows); } catch (e) { Log.error('audit', e); }
    }
  }

  // -------------------------------------------------------------- helpers

  function requireText(value, label) {
    const s = str(value).trim();
    if (!s) throw new AppError('VALIDATION', label + ' is required.');
    return s;
  }

  function assertUniqueName(table, field, name, excludeId, message) {
    const keyCol = schemaKey(table);
    const clash = Repository.readAll(table).filter(function (r) {
      return String(r[field]).trim().toLowerCase() === String(name).trim().toLowerCase() &&
             r[keyCol] !== excludeId &&
             r.status === RECORD_STATUS.ACTIVE;
    });
    if (clash.length) throw new AppError('VALIDATION', message);
  }

  return {
    getSetting: getSetting, setSetting: setSetting, allSettings: allSettings,
    listLobs: listLobs, saveLob: saveLob, setLobStatus: setLobStatus,
    listMetrics: listMetrics, getMetric: getMetric, metricsForLob: metricsForLob,
    saveMetric: saveMetric, setMetricStatus: setMetricStatus,
    assignMetricToLobs: assignMetricToLobs, lobIdsForMetric: lobIdsForMetric,
    listTargets: listTargets, saveTarget: saveTarget, resolveTarget: resolveTarget,
    listDimension: listDimension, saveDimension: saveDimension,
    setDimensionStatus: setDimensionStatus,
    audit: audit
  };
})();
