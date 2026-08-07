/**
 * Schema.gs
 * -----------------------------------------------------------------------------
 * Single source of truth for every table's shape.
 *
 * Repository.gs reads this to coerce values on read/write, Bootstrap.gs reads it
 * to create tabs and header rows, and Migrations.gs diffs it against the live
 * sheet to add columns non-destructively. Declaring a column here is the only
 * step needed to add one.
 *
 * Column types: 'string' | 'number' | 'boolean' | 'date' (ISO yyyy-MM-dd)
 *               | 'datetime' (ISO 8601) | 'json'
 */

/** @return {!Object<string, {key:string, pk:(boolean|undefined), columns:!Array}>} */
function SCHEMA() {
  return {

    // ---------------------------------------------------------------- config

    [TABLE.LOB]: {
      key: 'lob_id',
      columns: [
        { name: 'lob_id', type: 'string' },
        { name: 'lob_name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'parent_lob_id', type: 'string' },   // nesting, e.g. C2R under Customer Service
        { name: 'sort_order', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'datetime' },
        { name: 'created_by', type: 'string' },
        { name: 'updated_at', type: 'datetime' },
        { name: 'updated_by', type: 'string' }
      ]
    },

    /**
     * The metric registry. Phase 1 of this project found that no metric in the
     * source deck had a written definition, numerator, denominator or owner —
     * which is how the same KPI ended up with four different denominators
     * across one document. Those fields are mandatory here.
     */
    [TABLE.METRIC]: {
      key: 'metric_id',
      columns: [
        { name: 'metric_id', type: 'string' },
        { name: 'metric_name', type: 'string' },
        { name: 'display_name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'definition', type: 'string' },          // the formula, in words
        { name: 'category', type: 'string' },
        { name: 'data_type', type: 'string' },           // DATA_TYPE — drives every engine
        { name: 'unit', type: 'string' },                // UNIT
        { name: 'decimal_places', type: 'number' },
        { name: 'direction_of_success', type: 'string' },// DIRECTION
        { name: 'aggregation_rule', type: 'string' },    // AGGREGATION
        { name: 'weight_field', type: 'string' },        // for WEIGHTED_MEAN: 'denominator'
        { name: 'default_frequency', type: 'string' },   // PERIOD_TYPE
        { name: 'valid_min', type: 'number' },
        { name: 'valid_max', type: 'number' },
        { name: 'requires_denominator', type: 'boolean' },
        { name: 'numerator_label', type: 'string' },     // e.g. "5-star surveys"
        { name: 'denominator_label', type: 'string' },   // e.g. "surveys received"
        { name: 'instrument', type: 'string' },          // operational-CSAT != survey-CSAT
        { name: 'source_system', type: 'string' },
        { name: 'owner', type: 'string' },
        { name: 'min_sample_observation', type: 'number' },
        { name: 'min_sample_cross_sectional', type: 'number' },
        { name: 'min_periods_control_chart', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'datetime' },
        { name: 'created_by', type: 'string' },
        { name: 'updated_at', type: 'datetime' },
        { name: 'updated_by', type: 'string' }
      ]
    },

    /** Many-to-many: a metric can apply to several LOBs. */
    [TABLE.METRIC_LOB]: {
      key: 'metric_lob_id',
      columns: [
        { name: 'metric_lob_id', type: 'string' },
        { name: 'metric_id', type: 'string' },
        { name: 'lob_id', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'datetime' },
        { name: 'created_by', type: 'string' }
      ]
    },

    /**
     * Targets are EFFECTIVE-DATED. Without valid_from/valid_to, editing a target
     * silently rewrites every historical status and streak in the system — last
     * quarter's "6 consecutive weeks above target" becomes false retroactively.
     * A fact is always judged against the target in force on its period start.
     */
    [TABLE.TARGET]: {
      key: 'target_id',
      columns: [
        { name: 'target_id', type: 'string' },
        { name: 'metric_id', type: 'string' },
        { name: 'scope_type', type: 'string' },      // TARGET_SCOPE
        { name: 'scope_id', type: 'string' },        // '' for GLOBAL
        { name: 'period_type', type: 'string' },     // '' = applies to all frequencies
        { name: 'target_value', type: 'number' },
        { name: 'min_threshold', type: 'number' },
        { name: 'max_threshold', type: 'number' },
        { name: 'stretch_value', type: 'number' },
        { name: 'valid_from', type: 'date' },
        { name: 'valid_to', type: 'date' },          // '' = open ended
        { name: 'notes', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'datetime' },
        { name: 'created_by', type: 'string' }
      ]
    },

    /**
     * Periods. period_label is preserved verbatim — "Week 31", "Week 31 - July",
     * "August W1", "Q3 W1" — and never auto-replaced.
     *
     * sort_key is ALWAYS start_date. Time series must never sort by label:
     * "Week 31" string-sorts before "Week 4", and "August W1" does not sort
     * at all. Every ordering, and the definition of "previous period", derives
     * from dates.
     */
    [TABLE.PERIOD]: {
      key: 'period_id',
      columns: [
        { name: 'period_id', type: 'string' },
        { name: 'period_type', type: 'string' },
        { name: 'period_label', type: 'string' },
        { name: 'start_date', type: 'date' },
        { name: 'end_date', type: 'date' },
        { name: 'sort_key', type: 'string' },        // = start_date, denormalised for speed
        { name: 'year', type: 'number' },
        { name: 'quarter', type: 'number' },
        { name: 'month', type: 'number' },
        { name: 'week_number', type: 'number' },
        { name: 'calendar_id', type: 'string' },     // parallel calendars: calendar / fiscal
        { name: 'is_closed', type: 'boolean' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'datetime' },
        { name: 'created_by', type: 'string' }
      ]
    },

    /**
     * Chart titles are fully independent of metric names. The metric may be
     * "Quality @ Uber - Experience" while the chart reads "Customer Experience
     * Quality" — the technical name is never forced into the presentation.
     */
    [TABLE.CHART]: {
      key: 'chart_id',
      columns: [
        { name: 'chart_id', type: 'string' },
        { name: 'chart_title', type: 'string' },
        { name: 'subtitle', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'footer', type: 'string' },
        { name: 'chart_type', type: 'string' },      // CHART_TYPE
        { name: 'metric_ids', type: 'json' },
        { name: 'lob_ids', type: 'json' },
        { name: 'subject_type', type: 'string' },
        { name: 'period_type', type: 'string' },
        { name: 'period_count', type: 'number' },    // trailing N periods
        { name: 'x_axis_label', type: 'string' },
        { name: 'y_axis_label', type: 'string' },
        { name: 'y_min', type: 'number' },
        { name: 'y_max', type: 'number' },
        { name: 'show_target_line', type: 'boolean' },
        { name: 'show_benchmark', type: 'boolean' },
        { name: 'benchmark_subject_type', type: 'string' },
        { name: 'benchmark_subject_id', type: 'string' },
        { name: 'show_data_labels', type: 'boolean' },
        { name: 'show_percentage', type: 'boolean' },
        { name: 'show_absolute', type: 'boolean' },
        { name: 'comparison_period', type: 'string' },
        { name: 'dashboard_id', type: 'string' },
        { name: 'sort_order', type: 'number' },
        { name: 'width', type: 'string' },           // 'half' | 'full'
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'datetime' },
        { name: 'created_by', type: 'string' },
        { name: 'updated_at', type: 'datetime' },
        { name: 'updated_by', type: 'string' }
      ]
    },

    [TABLE.DASHBOARD]: {
      key: 'dashboard_id',
      columns: [
        { name: 'dashboard_id', type: 'string' },
        { name: 'dashboard_name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'visible_to_roles', type: 'json' },
        { name: 'sort_order', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'datetime' },
        { name: 'created_by', type: 'string' }
      ]
    },

    [TABLE.SETTINGS]: {
      key: 'setting_key',
      columns: [
        { name: 'setting_key', type: 'string' },
        { name: 'setting_value', type: 'string' },
        { name: 'value_type', type: 'string' },      // number | string | boolean | json
        { name: 'description', type: 'string' },
        { name: 'updated_at', type: 'datetime' },
        { name: 'updated_by', type: 'string' }
      ]
    },

    // ------------------------------------------------------------ dimensions

    [TABLE.AGENT]: {
      key: 'agent_id',
      columns: [
        { name: 'agent_id', type: 'string' },
        { name: 'agent_name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'lob_id', type: 'string' },
        { name: 'team_id', type: 'string' },
        { name: 'manager_id', type: 'string' },
        { name: 'region_id', type: 'string' },
        { name: 'site', type: 'string' },
        { name: 'employment_type', type: 'string' },
        { name: 'hire_date', type: 'date' },
        { name: 'termination_date', type: 'date' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'datetime' },
        { name: 'created_by', type: 'string' },
        { name: 'updated_at', type: 'datetime' },
        { name: 'updated_by', type: 'string' }
      ]
    },

    [TABLE.TEAM]: {
      key: 'team_id',
      columns: [
        { name: 'team_id', type: 'string' },
        { name: 'team_name', type: 'string' },
        { name: 'lob_id', type: 'string' },
        { name: 'manager_id', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'datetime' },
        { name: 'created_by', type: 'string' }
      ]
    },

    [TABLE.MANAGER]: {
      key: 'manager_id',
      columns: [
        { name: 'manager_id', type: 'string' },
        { name: 'manager_name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'lob_id', type: 'string' },
        { name: 'region_id', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'datetime' },
        { name: 'created_by', type: 'string' }
      ]
    },

    [TABLE.REGION]: {
      key: 'region_id',
      columns: [
        { name: 'region_id', type: 'string' },
        { name: 'region_name', type: 'string' },
        { name: 'country', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'datetime' },
        { name: 'created_by', type: 'string' }
      ]
    },

    /**
     * Benchmark cohorts — populations with no operator behind them. Carried
     * forward from the Phase 1 analysis, where the reference deck compared a
     * service against "Seniors" and "All Riders" cohorts. Without this, a
     * cohort comparison has nowhere to live except a hardcoded chart.
     */
    [TABLE.COHORT]: {
      key: 'cohort_id',
      columns: [
        { name: 'cohort_id', type: 'string' },
        { name: 'cohort_name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'population_definition', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'created_at', type: 'datetime' },
        { name: 'created_by', type: 'string' }
      ]
    },

    // ----------------------------------------------------------------- facts

    /**
     * One polymorphic fact table. An agent CSAT row, an LOB-level Service Level
     * typed in directly, and a benchmark cohort's defect rate are structurally
     * identical — they differ only in what the subject is. Two tables would mean
     * two of every engine.
     *
     * The table holds ENTERED data only. Anything the aggregation engine derives
     * lands in agg_*, never here, so a rollup can never double-count against a
     * typed-in parent row. Where both exist, the UI shows them side by side as a
     * reconciliation check.
     *
     * Partitioned by year at the Repository layer: fact_metric_value_2026.
     */
    [TABLE.FACT]: {
      key: 'fact_id',
      columns: [
        { name: 'fact_id', type: 'string' },
        { name: 'idempotency_key', type: 'string' },  // hash(subject+metric+period+instrument)
        { name: 'subject_type', type: 'string' },
        { name: 'subject_id', type: 'string' },
        { name: 'lob_id', type: 'string' },           // denormalised for filter speed
        { name: 'team_id', type: 'string' },
        { name: 'manager_id', type: 'string' },
        { name: 'region_id', type: 'string' },
        { name: 'metric_id', type: 'string' },
        { name: 'period_id', type: 'string' },
        { name: 'period_type', type: 'string' },
        { name: 'period_start', type: 'date' },       // denormalised: every sort uses it
        { name: 'numerator', type: 'number' },
        { name: 'denominator', type: 'number' },
        { name: 'value', type: 'number' },
        { name: 'target_snapshot', type: 'number' },  // target in force when written
        { name: 'target_id_snapshot', type: 'string' },
        { name: 'unit_snapshot', type: 'string' },
        { name: 'source', type: 'string' },           // SOURCE
        { name: 'entry_status', type: 'string' },     // ENTRY_STATUS
        { name: 'quality_flags', type: 'json' },
        { name: 'comments', type: 'string' },
        { name: 'version', type: 'number' },          // optimistic lock
        { name: 'created_at', type: 'datetime' },
        { name: 'created_by', type: 'string' },
        { name: 'updated_at', type: 'datetime' },
        { name: 'updated_by', type: 'string' }
      ]
    },

    // ---------------------------------------------- materialised (derived)
    // Never authored by a human. Fully rebuildable from facts + config.

    [TABLE.AGG_SUBJECT]: {
      key: 'agg_id',
      columns: [
        { name: 'agg_id', type: 'string' },
        { name: 'subject_type', type: 'string' },
        { name: 'subject_id', type: 'string' },
        { name: 'metric_id', type: 'string' },
        { name: 'period_id', type: 'string' },
        { name: 'period_type', type: 'string' },
        { name: 'period_start', type: 'date' },
        { name: 'numerator_sum', type: 'number' },
        { name: 'denominator_sum', type: 'number' },
        { name: 'value', type: 'number' },
        { name: 'aggregation_rule', type: 'string' }, // which rule produced `value`
        { name: 'is_weighted', type: 'boolean' },     // false => UI shows "unweighted" badge
        { name: 'contributor_count', type: 'number' },// how many facts rolled up
        { name: 'observation_count', type: 'number' },// total denominator behind it
        { name: 'target', type: 'number' },
        { name: 'status', type: 'string' },           // STATUS
        { name: 'computed_at', type: 'datetime' }
      ]
    },

    [TABLE.AGG_DELTA]: {
      key: 'delta_id',
      columns: [
        { name: 'delta_id', type: 'string' },
        { name: 'subject_type', type: 'string' },
        { name: 'subject_id', type: 'string' },
        { name: 'metric_id', type: 'string' },
        { name: 'period_id', type: 'string' },
        { name: 'period_start', type: 'date' },
        { name: 'comparison_type', type: 'string' },  // COMPARISON
        { name: 'compare_period_id', type: 'string' },
        { name: 'value_from', type: 'number' },
        { name: 'value_to', type: 'number' },
        { name: 'absolute_change', type: 'number' },
        { name: 'percent_change', type: 'number' },
        { name: 'pp_change', type: 'number' },
        { name: 'interpretation', type: 'string' },   // INTERPRETATION, direction-aware
        { name: 'n_from', type: 'number' },
        { name: 'n_to', type: 'number' },
        { name: 'reliable', type: 'boolean' },        // both sides cleared the sample gate
        { name: 'streak_direction', type: 'string' },
        { name: 'streak_length', type: 'number' },
        { name: 'computed_at', type: 'datetime' }
      ]
    },

    // ---------------------------------------------------------------- system

    [TABLE.AUDIT]: {
      key: 'audit_id',
      columns: [
        { name: 'audit_id', type: 'string' },
        { name: 'entity_table', type: 'string' },
        { name: 'entity_id', type: 'string' },
        { name: 'action', type: 'string' },           // CREATE | UPDATE | DEACTIVATE | ...
        { name: 'field', type: 'string' },
        { name: 'old_value', type: 'string' },
        { name: 'new_value', type: 'string' },
        { name: 'actor', type: 'string' },
        { name: 'at', type: 'datetime' }
      ]
    },

    [TABLE.ERROR]: {
      key: 'error_id',
      columns: [
        { name: 'error_id', type: 'string' },
        { name: 'level', type: 'string' },
        { name: 'context', type: 'string' },
        { name: 'message', type: 'string' },
        { name: 'stack', type: 'string' },
        { name: 'actor', type: 'string' },
        { name: 'at', type: 'datetime' }
      ]
    },

    [TABLE.JOB]: {
      key: 'job_id',
      columns: [
        { name: 'job_id', type: 'string' },
        { name: 'job_name', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'rows_processed', type: 'number' },
        { name: 'duration_ms', type: 'number' },
        { name: 'cursor', type: 'string' },           // resume point for chunked jobs
        { name: 'message', type: 'string' },
        { name: 'started_at', type: 'datetime' },
        { name: 'finished_at', type: 'datetime' }
      ]
    },

    [TABLE.SCHEMA]: {
      key: 'version',
      columns: [
        { name: 'version', type: 'number' },
        { name: 'applied_at', type: 'datetime' },
        { name: 'notes', type: 'string' }
      ]
    }
  };
}

/** @return {!Array<string>} Ordered column names for a table. */
function schemaColumns(tableName) {
  const def = SCHEMA()[tableName];
  if (!def) throw new Error('Unknown table: ' + tableName);
  return def.columns.map(function (c) { return c.name; });
}

/** @return {string} Primary key column for a table. */
function schemaKey(tableName) {
  const def = SCHEMA()[tableName];
  if (!def) throw new Error('Unknown table: ' + tableName);
  return def.key;
}

/** @return {!Object<string,string>} column name -> declared type. */
function schemaTypes(tableName) {
  const def = SCHEMA()[tableName];
  if (!def) throw new Error('Unknown table: ' + tableName);
  const out = {};
  def.columns.forEach(function (c) { out[c.name] = c.type; });
  return out;
}
