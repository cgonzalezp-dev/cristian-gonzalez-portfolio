/**
 * Bootstrap.gs
 * -----------------------------------------------------------------------------
 * First-run setup, schema migration and trigger installation.
 *
 * Migrations are ADDITIVE ONLY. A new column is appended to the live sheet; an
 * existing column is never renamed, reordered or dropped by an upgrade. Because
 * Repository maps columns by header name rather than position, a sheet that has
 * been manually reordered still reads correctly.
 */

const Bootstrap = (function () {

  /** Create every tab, seed settings, install triggers. Safe to re-run. */
  function setup() {
    return withLock(function () {
      const schema = SCHEMA();
      const created = [];

      Object.keys(schema).forEach(function (tableName) {
        if (tableName === TABLE.FACT) return; // partitions are created on demand
        const sh = Repository.sheetFor(tableName, null, true);
        if (sh) created.push(tableName);
      });

      // Current-year fact partition, so the first submission is not the thing
      // that discovers the table does not exist.
      Repository.sheetFor(TABLE.FACT, new Date().getUTCFullYear(), true);

      migrate();
      seedSettings();
      installTriggers();
      Cache.invalidate();

      return {
        tables: created.length,
        schemaVersion: APP.SCHEMA_VERSION,
        spreadsheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl()
      };
    });
  }

  /**
   * Add any column declared in Schema.gs that is missing from the live sheet.
   * Never destructive.
   */
  function migrate() {
    const schema = SCHEMA();
    const applied = [];

    Object.keys(schema).forEach(function (tableName) {
      const partitions = tableName === TABLE.FACT
        ? Repository.factPartitions()
        : [null];

      partitions.forEach(function (partition) {
        const sh = Repository.sheetFor(tableName, partition, false);
        if (!sh) return;

        const wanted = schemaColumns(tableName);
        const lastCol = Math.max(1, sh.getLastColumn());
        const header = sh.getRange(1, 1, 1, lastCol).getValues()[0]
                         .map(function (h) { return String(h).trim(); });

        const missing = wanted.filter(function (c) { return header.indexOf(c) < 0; });
        if (!missing.length) return;

        sh.getRange(1, header.length + 1, 1, missing.length).setValues([missing]);
        sh.getRange(1, 1, 1, header.length + missing.length).setFontWeight('bold');
        applied.push(Repository.physicalName(tableName, partition) + ': +' + missing.join(', '));
      });
    });

    const current = Repository.readAll(TABLE.SCHEMA)
      .map(function (r) { return r.version; })
      .sort(function (a, b) { return b - a; })[0] || 0;

    if (current < APP.SCHEMA_VERSION) {
      Repository.insert(TABLE.SCHEMA, {
        version: APP.SCHEMA_VERSION,
        applied_at: nowIso(),
        notes: applied.length ? applied.join(' | ') : 'Initial schema'
      });
    }
    return applied;
  }

  /** Write the shipped defaults for any setting not yet persisted. */
  function seedSettings() {
    const existing = {};
    Repository.readAll(TABLE.SETTINGS).forEach(function (r) {
      existing[r.setting_key] = true;
    });

    const rows = [];
    Object.keys(DEFAULT_SETTINGS).forEach(function (key) {
      if (existing[key]) return;
      const value = DEFAULT_SETTINGS[key];
      rows.push({
        setting_key: key,
        setting_value: String(value),
        value_type: typeof value === 'number' ? 'number'
                  : typeof value === 'boolean' ? 'boolean' : 'string',
        description: SETTING_DESCRIPTIONS[key] || '',
        updated_at: nowIso(),
        updated_by: 'system'
      });
    });

    // Deployment-specific settings that have no sensible shipped default.
    if (!existing.admin_emails) {
      rows.push({
        setting_key: 'admin_emails', setting_value: Auth.currentUser(),
        value_type: 'string',
        description: 'Comma-separated emails with full configuration access.',
        updated_at: nowIso(), updated_by: 'system'
      });
    }
    if (!existing.default_role) {
      rows.push({
        setting_key: 'default_role', setting_value: ROLE.VIEWER, value_type: 'string',
        description: 'Role for users not listed as admin or manager.',
        updated_at: nowIso(), updated_by: 'system'
      });
    }

    if (rows.length) Repository.insertMany(TABLE.SETTINGS, rows);
    return rows.length;
  }

  const SETTING_DESCRIPTIONS = {
    min_sample_cross_sectional:
      'Minimum subjects in a comparison group before peer comparison is labelled.',
    preferred_sample:
      'Population size above which comparisons are considered well powered.',
    min_sample_observation:
      'Minimum observations behind one subject value before it is ranked.',
    min_periods_control_chart:
      'Periods of history required before control limits are calculated.',
    rolling_window: 'Default rolling-average window, in periods.',
    stable_band_pp:
      'Movements smaller than this read as "held steady" rather than a trend.',
    unexpected_jump_sd:
      'Standard deviations from a subject\'s own history before a value is flagged.',
    outlier_method: 'Default cross-sectional outlier method (IQR, ZSCORE, ROBUST_Z).',
    zscore_threshold: 'Z-score beyond which an observation is flagged.',
    iqr_multiplier: 'Multiplier applied to the interquartile range for fences.',
    persistence_periods_required:
      'How many recent periods a subject must be flagged in before it is actioned.',
    persistence_window: 'Window over which persistence is measured.',
    default_decimal_places: 'Decimal places used when a metric does not specify.',
    week_start_day: 'First day of the reporting week (1 = Monday).'
  };

  /** Nightly rebuild trigger. Replaces any existing one so re-running is safe. */
  function installTriggers() {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === 'nightlyRebuildTrigger') ScriptApp.deleteTrigger(t);
    });
    ScriptApp.newTrigger('nightlyRebuildTrigger')
      .timeBased().atHour(3).everyDays(1).create();
    return true;
  }

  /**
   * Optional demo data so a fresh deployment has something to look at.
   * Creates a couple of LOBs, a few metrics covering different data types, a
   * quarter of weekly periods and matching targets — then leaves. It writes no
   * facts, because invented performance numbers in a real deployment are worse
   * than an empty dashboard.
   */
  function seedStarterConfig() {
    return withLock(function () {
      if (ConfigService.listMetrics(true).length) {
        throw new AppError('VALIDATION',
          'Configuration already exists. Starter setup only runs on an empty system.');
      }

      const csLob = ConfigService.saveLob({
        lob_name: 'Customer Service',
        description: 'Inbound contact handling.'
      });
      const vsLob = ConfigService.saveLob({
        lob_name: 'Vehicle Solutions',
        description: 'Fleet and vehicle support.'
      });

      const metrics = [
        {
          metric_name: 'CSAT', display_name: 'Customer Satisfaction',
          definition: 'Surveys rated 4 or 5 divided by surveys received.',
          category: 'Experience', data_type: DATA_TYPE.PROPORTION, unit: UNIT.PERCENT,
          direction_of_success: DIRECTION.HIGHER_IS_BETTER,
          aggregation_rule: AGGREGATION.SUM_RATIO, requires_denominator: true,
          numerator_label: 'Satisfied responses', denominator_label: 'Surveys received',
          instrument: 'Post-contact survey', default_frequency: PERIOD_TYPE.WEEKLY,
          valid_min: 0, valid_max: 100, decimal_places: 1
        },
        {
          metric_name: 'Service Level', display_name: 'Service Level',
          definition: 'Contacts answered within the threshold divided by contacts offered.',
          category: 'Operations', data_type: DATA_TYPE.PROPORTION, unit: UNIT.PERCENT,
          direction_of_success: DIRECTION.HIGHER_IS_BETTER,
          aggregation_rule: AGGREGATION.SUM_RATIO, requires_denominator: true,
          numerator_label: 'Answered in threshold', denominator_label: 'Contacts offered',
          default_frequency: PERIOD_TYPE.WEEKLY, valid_min: 0, valid_max: 100,
          decimal_places: 1
        },
        {
          metric_name: 'AHT', display_name: 'Average Handle Time',
          definition: 'Total handle seconds divided by contacts handled.',
          category: 'Operations', data_type: DATA_TYPE.DURATION, unit: UNIT.SECONDS,
          direction_of_success: DIRECTION.LOWER_IS_BETTER,
          aggregation_rule: AGGREGATION.WEIGHTED_MEAN, requires_denominator: true,
          numerator_label: 'Total handle seconds', denominator_label: 'Contacts handled',
          default_frequency: PERIOD_TYPE.WEEKLY, valid_min: 0, decimal_places: 0
        },
        {
          metric_name: 'Contacts Handled', display_name: 'Contact Volume',
          definition: 'Count of contacts handled in the period.',
          category: 'Volume', data_type: DATA_TYPE.COUNT, unit: UNIT.COUNT,
          direction_of_success: DIRECTION.TARGET_BASED,
          aggregation_rule: AGGREGATION.SUM, requires_denominator: false,
          default_frequency: PERIOD_TYPE.WEEKLY, valid_min: 0, decimal_places: 0
        }
      ];

      const created = metrics.map(function (m) {
        m.lob_ids = [csLob.lob_id, vsLob.lob_id];
        return ConfigService.saveMetric(m);
      });

      // Thirteen weeks of periods, starting from the most recent Monday.
      const today = toDateStr(new Date());
      const d = parseDateStr(today);
      const back = (d.getUTCDay() + 6) % 7 + 84;
      PeriodEngine.generate({
        period_type: PERIOD_TYPE.WEEKLY,
        start_date: addDays(today, -back),
        count: 13,
        label_pattern: 'Week {week}'
      });

      // Global targets, effective from the first generated period.
      const from = addDays(today, -back);
      ConfigService.saveTarget({ metric_id: created[0].metric_id, scope_type: TARGET_SCOPE.GLOBAL,
        target_value: 90, min_threshold: 85, valid_from: from });
      ConfigService.saveTarget({ metric_id: created[1].metric_id, scope_type: TARGET_SCOPE.GLOBAL,
        target_value: 80, min_threshold: 75, valid_from: from });
      ConfigService.saveTarget({ metric_id: created[2].metric_id, scope_type: TARGET_SCOPE.GLOBAL,
        target_value: 420, max_threshold: 480, valid_from: from });

      Cache.invalidate();
      return { lobs: 2, metrics: created.length, periods: 13, targets: 3 };
    });
  }

  return {
    setup: setup, migrate: migrate, seedSettings: seedSettings,
    installTriggers: installTriggers, seedStarterConfig: seedStarterConfig
  };
})();

/** Trigger target. Must be a top-level function for ScriptApp to bind it. */
function nightlyRebuildTrigger() {
  MaterializedViews.nightlyRebuild();
}
