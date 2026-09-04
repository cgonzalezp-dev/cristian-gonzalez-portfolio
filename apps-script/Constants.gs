/**
 * Constants.gs
 * -----------------------------------------------------------------------------
 * Every enumeration, quota ceiling and tunable default in one place.
 *
 * ARCHITECTURAL RULE (see docs/ARCHITECTURE.md §"Configuration-driven"):
 *   Nothing in this file names a business metric, LOB or period. Those live in
 *   the Sheets config tables and are created through the UI. This file describes
 *   *kinds* of things, never *instances* of them.
 */

/** Application identity. Bump APP.SCHEMA_VERSION to trigger Migrations.gs. */
const APP = Object.freeze({
  NAME: 'Operations Performance Platform',
  SHORT_NAME: 'OPP',
  VERSION: '1.0.0',
  SCHEMA_VERSION: 1
});

/**
 * Metric data types. THE dispatch key for the entire calculation engine.
 *
 * Engines branch on data_type, never on metric identity. Adding "Forecast
 * Accuracy" means adding a config row with data_type=PROPORTION — zero code.
 * Adding a genuinely new *kind* of mathematics means adding a strategy in
 * MetricStrategy.gs, which should happen approximately never.
 */
const DATA_TYPE = Object.freeze({
  PROPORTION: 'PROPORTION',       // 0-100%   CSAT top-box, Quality, Service Level, FCR
  ORDINAL_SCALE: 'ORDINAL_SCALE', // 1-5      CSAT mean score
  DURATION: 'DURATION',           // seconds  AHT, ASA, hold time
  COUNT: 'COUNT',                 // integer  contacts, escalations, headcount
  RATE_PER_UNIT: 'RATE_PER_UNIT', // x per y  defects per 1000 trips
  CURRENCY: 'CURRENCY',           // money    revenue, cost
  INDEX_SCORE: 'INDEX_SCORE'      // -100..100 NPS
});

/** Display/derivation unit. Distinct from data type: PROPORTION is always a
 *  ratio, but may render as % or as a 0-1 ratio. */
const UNIT = Object.freeze({
  PERCENT: 'PERCENT',
  RATIO: 'RATIO',
  SECONDS: 'SECONDS',
  MINUTES: 'MINUTES',
  COUNT: 'COUNT',
  CURRENCY_USD: 'CURRENCY_USD',
  SCORE: 'SCORE',
  POINTS: 'POINTS'
});

/**
 * Direction of success. Determines status, trend interpretation, ranking order
 * and insight verbs. Never inferred from the metric name.
 */
const DIRECTION = Object.freeze({
  HIGHER_IS_BETTER: 'HIGHER_IS_BETTER',
  LOWER_IS_BETTER: 'LOWER_IS_BETTER',
  TARGET_BASED: 'TARGET_BASED'
});

/**
 * Aggregation rule. How child rows roll into a parent.
 *
 * SUM_RATIO is the correct default for every proportion metric:
 *   sum(numerator) / sum(denominator)
 * Averaging agent-level percentages is arithmetically wrong whenever agents
 * have different denominators — which is always. See docs/DATA-MODEL.md.
 */
const AGGREGATION = Object.freeze({
  SUM_RATIO: 'SUM_RATIO',
  WEIGHTED_MEAN: 'WEIGHTED_MEAN',
  SIMPLE_MEAN: 'SIMPLE_MEAN',   // fallback only; results carry an "unweighted" badge
  SUM: 'SUM',
  MEDIAN: 'MEDIAN',
  MIN: 'MIN',
  MAX: 'MAX',
  LAST: 'LAST',
  COUNT: 'COUNT'
});

/** Reporting frequency. CUSTOM lets the user define arbitrary windows. */
const PERIOD_TYPE = Object.freeze({
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
  CUSTOM: 'CUSTOM'
});

/** What a fact row is *about*. One polymorphic fact table serves every grain. */
const SUBJECT_TYPE = Object.freeze({
  AGENT: 'AGENT',
  TEAM: 'TEAM',
  MANAGER: 'MANAGER',
  LOB: 'LOB',
  REGION: 'REGION',
  COHORT: 'COHORT',   // benchmark series with no operator behind it
  GLOBAL: 'GLOBAL'
});

/**
 * Comparison type. Phase 1 of this project found an executive deck where "Δ"
 * meant a cohort gap but read as a time trend. Deltas are typed so the UI can
 * never render those two identically again.
 */
const COMPARISON = Object.freeze({
  VS_PRIOR_PERIOD: 'VS_PRIOR_PERIOD',
  VS_TARGET: 'VS_TARGET',
  VS_COHORT: 'VS_COHORT',
  VS_ROLLING_AVG: 'VS_ROLLING_AVG',
  VS_SAME_PERIOD_LAST_YEAR: 'VS_SAME_PERIOD_LAST_YEAR'
});

/** Direction-aware verdict on a delta. Computed *after* applying DIRECTION. */
const INTERPRETATION = Object.freeze({
  IMPROVED: 'IMPROVED',
  DECLINED: 'DECLINED',
  STABLE: 'STABLE',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA'
});

/** Status of a value against its resolved target. */
const STATUS = Object.freeze({
  ON_TARGET: 'ON_TARGET',
  ABOVE_TARGET: 'ABOVE_TARGET',
  BELOW_TARGET: 'BELOW_TARGET',
  AT_RISK: 'AT_RISK',            // inside threshold band but trending wrong way
  NO_TARGET: 'NO_TARGET',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA'
});

const RECORD_STATUS = Object.freeze({ ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' });

const ENTRY_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED'
});

const SOURCE = Object.freeze({ ENTRY: 'ENTRY', IMPORT: 'IMPORT', API: 'API' });

/** Target resolution precedence — most specific wins, first match returned. */
const TARGET_SCOPE = Object.freeze({
  AGENT: 'AGENT',
  MANAGER: 'MANAGER',
  TEAM: 'TEAM',
  REGION: 'REGION',
  LOB: 'LOB',
  GLOBAL: 'GLOBAL'
});

const TARGET_PRECEDENCE = Object.freeze([
  TARGET_SCOPE.AGENT,
  TARGET_SCOPE.MANAGER,
  TARGET_SCOPE.TEAM,
  TARGET_SCOPE.REGION,
  TARGET_SCOPE.LOB,
  TARGET_SCOPE.GLOBAL
]);

/** Data-quality flag codes raised by DataQuality.gs. */
const QUALITY_FLAG = Object.freeze({
  OUT_OF_RANGE: 'OUT_OF_RANGE',
  IMPOSSIBLE_VALUE: 'IMPOSSIBLE_VALUE',
  MISSING_DENOMINATOR: 'MISSING_DENOMINATOR',
  DENOMINATOR_ZERO: 'DENOMINATOR_ZERO',
  NUMERATOR_EXCEEDS_DENOMINATOR: 'NUMERATOR_EXCEEDS_DENOMINATOR',
  LOW_SAMPLE: 'LOW_SAMPLE',
  UNEXPECTED_JUMP: 'UNEXPECTED_JUMP',
  DUPLICATE_SUPERSEDED: 'DUPLICATE_SUPERSEDED',
  VALUE_DERIVED_MISMATCH: 'VALUE_DERIVED_MISMATCH',
  MISSING_PERIOD: 'MISSING_PERIOD'
});

const ROLE = Object.freeze({
  ADMIN: 'ADMIN',       // config + everything
  MANAGER: 'MANAGER',   // entry + own team analytics
  ANALYST: 'ANALYST',   // entry + all analytics, no config
  VIEWER: 'VIEWER'      // read only
});

/** Chart kinds the renderer supports. All drawn as inline SVG — no libraries. */
const CHART_TYPE = Object.freeze({
  LINE: 'LINE',
  BAR: 'BAR',
  COLUMN: 'COLUMN',
  AREA: 'AREA',
  STACKED_BAR: 'STACKED_BAR',
  COMPARISON: 'COMPARISON',
  KPI_CARD: 'KPI_CARD'
});

/**
 * Google Apps Script / Sheets platform ceilings.
 *
 * Google revises these; treat as "verified at build time" and re-check against
 * https://developers.google.com/apps-script/guides/services/quotas before
 * relying on any of them in a capacity decision.
 */
const PLATFORM_LIMITS = Object.freeze({
  SCRIPT_RUNTIME_MS: 6 * 60 * 1000,
  SAFE_RUNTIME_MS: 4.5 * 60 * 1000,     // bail out and checkpoint before the hard stop
  CACHE_MAX_BYTES_PER_KEY: 100 * 1024,
  CACHE_MAX_TTL_SEC: 21600,
  PROPERTIES_MAX_BYTES_PER_VALUE: 9 * 1024,
  SHEET_MAX_CELLS: 10000000,
  LOCK_WAIT_MS: 30000
});

/**
 * Migration SLOs. When any of these trips, the Sheets fact store should move to
 * BigQuery/Postgres. Repository.gs is an interface precisely so that swap does
 * not touch a single engine or a single line of UI. Surfaced on the admin
 * health panel rather than buried in a doc.
 */
const MIGRATION_SLO = Object.freeze({
  MAX_LIVE_FACT_ROWS: 250000,
  MAX_DASHBOARD_P95_MS: 3000,
  MAX_NIGHTLY_REBUILD_MS: 20 * 60 * 1000,
  MAX_CONCURRENT_EDITORS: 20
});

/**
 * Tunable defaults, seeded into config_settings on bootstrap and editable in
 * the Configuration UI thereafter. Read them through ConfigService.getSetting()
 * — never reference this object at call sites, or they stop being tunable.
 */
const DEFAULT_SETTINGS = Object.freeze({
  // Sample-size gates. Three independent gates; see docs/ARCHITECTURE.md.
  min_sample_cross_sectional: 10,   // agents needed before peer comparison is labelled
  preferred_sample: 30,
  min_sample_observation: 20,       // observations behind one agent's value
  min_periods_control_chart: 20,    // periods needed before control limits are drawn

  // Trend interpretation
  rolling_window: 4,
  stable_band_pp: 0.5,              // |Δ| below this reads STABLE, not a trend
  unexpected_jump_sd: 3,

  // Reserved for the statistics phase (7): stored now so config is stable
  outlier_method: 'IQR',
  zscore_threshold: 2.0,
  iqr_multiplier: 1.5,
  persistence_periods_required: 2,
  persistence_window: 3,

  // Presentation
  default_decimal_places: 1,
  week_start_day: 1                 // 1 = Monday
});

/** Sheet tab names. Fact tables are suffixed with a year by Repository.gs. */
const TABLE = Object.freeze({
  LOB: 'config_lob',
  METRIC: 'config_metric',
  METRIC_LOB: 'config_metric_lob',
  TARGET: 'config_target',
  PERIOD: 'config_period',
  CHART: 'config_chart',
  DASHBOARD: 'config_dashboard',
  SETTINGS: 'config_settings',

  AGENT: 'dim_agent',
  TEAM: 'dim_team',
  MANAGER: 'dim_manager',
  REGION: 'dim_region',
  COHORT: 'dim_cohort',

  FACT: 'fact_metric_value',        // partitioned: fact_metric_value_2026

  AGG_SUBJECT: 'agg_subject_metric_period',
  AGG_DELTA: 'agg_delta',

  AUDIT: 'sys_audit_log',
  ERROR: 'sys_error_log',
  JOB: 'sys_job_run',
  SCHEMA: 'sys_schema_version'
});
