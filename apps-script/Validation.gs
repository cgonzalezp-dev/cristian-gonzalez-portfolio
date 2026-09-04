/**
 * Validation.gs
 * -----------------------------------------------------------------------------
 * Two layers, deliberately separate:
 *
 *   VALIDATION  — blocking. The submission is rejected and nothing is stored.
 *                 Reserved for things that would corrupt the model: unknown
 *                 metric, impossible arithmetic, numerator above denominator.
 *
 *   QUALITY     — non-blocking. The row is stored WITH a flag attached, visible
 *                 in the UI and filterable. Reserved for things that are
 *                 suspicious but might be true: a low sample, an unusual jump.
 *
 * The split matters. Blocking everything suspicious trains people to work
 * around the tool; flagging nothing lets bad data through silently. The
 * original source analysis for this project found six arithmetic errors in a
 * single 34-slide deck — every one of them would have been caught by the
 * checks below.
 */

const Validation = (function () {

  /**
   * Validate a single entry before it is written.
   * @param {!Object} input   raw submission from the form
   * @param {!Object} metric  config_metric row
   * @param {!Object} period  config_period row
   * @return {{errors: !Array<string>, warnings: !Array<!Object>, numerator, denominator, value}}
   */
  function validateEntry(input, metric, period) {
    const errors = [];
    const warnings = [];
    const strategy = MetricStrategy.forMetric(metric);

    let numerator = num(input.numerator);
    let denominator = num(input.denominator);
    let value = num(input.value);

    // ---- structural ------------------------------------------------------
    if (!input.subject_type || !SUBJECT_TYPE[input.subject_type]) {
      errors.push('Choose what this value is about (agent, LOB, cohort...).');
    }
    if (input.subject_type !== SUBJECT_TYPE.GLOBAL && !str(input.subject_id)) {
      errors.push('Choose a subject.');
    }
    if (!period) errors.push('Choose a reporting period.');

    // ---- numerator / denominator ----------------------------------------
    if (strategy.supportsDenominator) {
      if (denominator != null && denominator < 0) {
        errors.push('The denominator cannot be negative.');
      }
      if (denominator === 0) {
        errors.push('The denominator cannot be zero — there is nothing to divide by.');
      }
      if (numerator != null && denominator != null) {
        // For a proportion, numerator > denominator is arithmetically impossible.
        if (metric.data_type === DATA_TYPE.PROPORTION && numerator > denominator) {
          errors.push('The numerator (' + numerator + ') is larger than the denominator (' +
                      denominator + '). A proportion cannot exceed 100%.');
        }
        if (numerator < 0) errors.push('The numerator cannot be negative.');
      }
      if (metric.requires_denominator && denominator == null) {
        // Non-blocking: better to capture the value than to lose it, but the
        // row is marked so aggregates built from it can be flagged unweighted.
        warnings.push(flag(QUALITY_FLAG.MISSING_DENOMINATOR,
          'No denominator supplied. Rollups including this value will be unweighted.'));
      }
    }

    // ---- derive vs entered ----------------------------------------------
    const derived = MetricStrategy.deriveValue(metric, numerator, denominator);
    if (derived != null) {
      if (value != null && Math.abs(value - derived) > 0.05) {
        // The entered value disagrees with its own arithmetic. Store the
        // derived one — it is the only reproducible number — and flag it.
        warnings.push(flag(QUALITY_FLAG.VALUE_DERIVED_MISMATCH,
          'Entered value ' + round(value, 2) + ' does not match ' + numerator + '/' +
          denominator + ' = ' + round(derived, 2) + '. The calculated value was stored.'));
      }
      value = derived;
    }

    if (value == null) {
      errors.push('Enter a value, or a numerator and denominator to calculate one from.');
    }

    // ---- range ----------------------------------------------------------
    if (value != null) {
      const lo = metric.valid_min != null ? metric.valid_min : strategy.validRange.min;
      const hi = metric.valid_max != null ? metric.valid_max : strategy.validRange.max;

      if (lo != null && value < lo) {
        errors.push('Value ' + round(value, 2) + ' is below the valid minimum (' + lo + ').');
      }
      if (hi != null && value > hi) {
        // "CSAT = 145%" — impossible, not merely surprising.
        errors.push('Value ' + round(value, 2) + ' exceeds the configured valid range (' +
                    hi + ').');
      }
    }

    // ---- sample size -----------------------------------------------------
    const minObs = metric.min_sample_observation ||
                   ConfigService.getSetting('min_sample_observation');
    if (denominator != null && minObs && denominator < minObs) {
      warnings.push(flag(QUALITY_FLAG.LOW_SAMPLE,
        'Based on ' + denominator + ' observations (below the ' + minObs +
        ' threshold). Stored, but excluded from rankings and population statistics.'));
    }

    return {
      errors: errors,
      warnings: warnings,
      numerator: numerator,
      denominator: denominator,
      value: value
    };
  }

  /**
   * Checks that need the subject's history, run after the row is assembled but
   * before it is written.
   * @return {!Array<!Object>} additional quality flags
   */
  function historicalChecks(candidate, metric, history) {
    const flags = [];
    const values = history
      .map(function (h) { return h.value; })
      .filter(function (v) { return v != null; });

    if (values.length >= 4 && candidate.value != null) {
      const m = mean(values);
      const sd = stdev(values);
      const threshold = ConfigService.getSetting('unexpected_jump_sd');
      if (sd != null && sd > 0 && Math.abs(candidate.value - m) > threshold * sd) {
        flags.push(flag(QUALITY_FLAG.UNEXPECTED_JUMP,
          'Value is more than ' + threshold + ' standard deviations from this subject\'s ' +
          'own recent average (' + round(m, 1) + '). Worth confirming before it is used.'));
      }
    }
    return flags;
  }

  /** Uniform flag shape so the UI can render any of them the same way. */
  function flag(code, message) {
    return { code: code, message: message };
  }

  /**
   * Sample-size gate. Three INDEPENDENT gates, and conflating them is how
   * small-sample nonsense reaches a dashboard:
   *
   *   POPULATION   how many subjects are in the comparison group
   *   OBSERVATION  how many surveys/contacts sit behind one subject's value
   *   PERIOD       how many periods of history exist
   *
   * Each returns its own message, because "not enough data" without saying
   * which kind trains people to ignore all three.
   *
   * @return {{ok: boolean, gate: string, message: string}}
   */
  function sampleGate(kind, actual, metric) {
    let required, message;
    switch (kind) {
      case 'POPULATION':
        required = metric && metric.min_sample_cross_sectional
                 ? metric.min_sample_cross_sectional
                 : ConfigService.getSetting('min_sample_cross_sectional');
        message = 'Insufficient population (' + actual + ' of ' + required +
                  ' required) for reliable comparison.';
        break;
      case 'OBSERVATION':
        required = metric && metric.min_sample_observation
                 ? metric.min_sample_observation
                 : ConfigService.getSetting('min_sample_observation');
        message = 'Based on ' + actual + ' observations — not ranked.';
        break;
      case 'PERIOD':
        required = metric && metric.min_periods_control_chart
                 ? metric.min_periods_control_chart
                 : ConfigService.getSetting('min_periods_control_chart');
        message = actual + ' of ' + required + ' periods of history.';
        break;
      default:
        return { ok: true, gate: kind, message: '' };
    }
    const ok = actual >= required;
    return { ok: ok, gate: kind, required: required, actual: actual,
             message: ok ? '' : message };
  }

  return {
    validateEntry: validateEntry,
    historicalChecks: historicalChecks,
    sampleGate: sampleGate,
    flag: flag
  };
})();
