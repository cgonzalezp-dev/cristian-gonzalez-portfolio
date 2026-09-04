/**
 * Utils.gs
 * -----------------------------------------------------------------------------
 * Pure helpers. No Sheets access, no state, no business rules — so every
 * function here is trivially testable from Tests.gs.
 */

/** @return {string} RFC4122-ish unique id, prefixed for readability in sheets. */
function uid(prefix) {
  return (prefix ? prefix + '_' : '') + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

/**
 * Stable short hash. Used for idempotency keys, so the same logical submission
 * always produces the same key regardless of session.
 * @return {string}
 */
function hashKey(parts) {
  const input = parts.map(function (p) { return String(p == null ? '' : p); }).join('');
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input);
  return bytes.map(function (b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('').slice(0, 24);
}

/** @return {string} ISO-8601 timestamp. */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Normalise anything date-ish to 'yyyy-MM-dd'.
 * Dates are stored as strings, not Sheets Date objects: Sheets applies the
 * spreadsheet timezone on read, which silently shifts a period boundary by a
 * day for anyone in another timezone.
 * @return {string} '' when the input is not a usable date.
 */
function toDateStr(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    return Utilities.formatDate(value, 'UTC', 'yyyy-MM-dd');
  }
  const s = String(value).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  // dd/MM/yyyy — the format used in the period picker
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (dmy) return dmy[3] + '-' + pad2(dmy[2]) + '-' + pad2(dmy[1]);
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return Utilities.formatDate(parsed, 'UTC', 'yyyy-MM-dd');
  return '';
}

function pad2(n) { return ('0' + n).slice(-2); }

/** @return {Date} UTC-anchored date from 'yyyy-MM-dd'. */
function parseDateStr(s) {
  const d = toDateStr(s);
  if (!d) return null;
  const parts = d.split('-');
  return new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
}

/** @return {number} whole days between two 'yyyy-MM-dd' strings. */
function daysBetween(a, b) {
  const da = parseDateStr(a), db = parseDateStr(b);
  if (!da || !db) return 0;
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function addDays(dateStr, n) {
  const d = parseDateStr(dateStr);
  if (!d) return '';
  d.setUTCDate(d.getUTCDate() + n);
  return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
}

/** ISO-8601 week number. Used to pre-fill week_number, never to order periods. */
function isoWeekNumber(dateStr) {
  const d = parseDateStr(dateStr);
  if (!d) return null;
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;          // Mon = 0
  target.setUTCDate(target.getUTCDate() - dayNum + 3);  // nearest Thursday
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  return 1 + Math.round((target - firstThursday) / (7 * 86400000));
}

function quarterOf(dateStr) {
  const d = parseDateStr(dateStr);
  return d ? Math.floor(d.getUTCMonth() / 3) + 1 : null;
}

/** @return {number|null} Coerce to a finite number, or null. Never NaN. */
function num(value) {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'number') return isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[\s,%$]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return isFinite(n) ? n : null;
}

function bool(value) {
  if (typeof value === 'boolean') return value;
  const s = String(value).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1';
}

function str(value) {
  return value === null || value === undefined ? '' : String(value);
}

function parseJson(value, fallback) {
  if (value === '' || value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(String(value)); } catch (e) { return fallback; }
}

/** Round half-away-from-zero to n places. Avoids float display artefacts. */
function round(value, places) {
  if (value == null || !isFinite(value)) return null;
  const f = Math.pow(10, places == null ? 2 : places);
  return Math.round((value + (value >= 0 ? 1e-9 : -1e-9)) * f) / f;
}

/** Clamp helper used by chart scales. */
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

/** Group an array of objects by a key function. @return {!Object<string,!Array>} */
function groupBy(rows, keyFn) {
  const out = {};
  for (let i = 0; i < rows.length; i++) {
    const k = keyFn(rows[i]);
    if (!out[k]) out[k] = [];
    out[k].push(rows[i]);
  }
  return out;
}

/** @return {!Array} Unique values, order preserved. */
function unique(arr) {
  const seen = {}, out = [];
  for (let i = 0; i < arr.length; i++) {
    const k = String(arr[i]);
    if (!seen[k]) { seen[k] = true; out.push(arr[i]); }
  }
  return out;
}

function sum(arr) {
  let t = 0;
  for (let i = 0; i < arr.length; i++) if (arr[i] != null && isFinite(arr[i])) t += arr[i];
  return t;
}

function mean(arr) {
  const vals = arr.filter(function (v) { return v != null && isFinite(v); });
  return vals.length ? sum(vals) / vals.length : null;
}

function median(arr) {
  const vals = arr.filter(function (v) { return v != null && isFinite(v); })
                  .sort(function (a, b) { return a - b; });
  if (!vals.length) return null;
  const mid = Math.floor(vals.length / 2);
  return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
}

/** Sample standard deviation (n-1). Returns null below 2 observations. */
function stdev(arr) {
  const vals = arr.filter(function (v) { return v != null && isFinite(v); });
  if (vals.length < 2) return null;
  const m = mean(vals);
  const ss = vals.reduce(function (acc, v) { return acc + (v - m) * (v - m); }, 0);
  return Math.sqrt(ss / (vals.length - 1));
}

/**
 * Format a value for display according to its unit.
 * Presentation only — storage is always canonical (percent as 0-100, duration
 * as seconds), so a formatting change can never alter stored data.
 */
function formatValue(value, unit, decimals) {
  if (value == null || !isFinite(value)) return '—';
  const dp = decimals == null ? 1 : decimals;
  switch (unit) {
    case UNIT.PERCENT:      return round(value, dp).toFixed(dp) + '%';
    case UNIT.RATIO:        return round(value, dp + 2).toFixed(dp + 2);
    case UNIT.SECONDS:      return formatDuration(value);
    case UNIT.MINUTES:      return formatDuration(value * 60);
    case UNIT.CURRENCY_USD: return '$' + round(value, dp).toLocaleString('en-US',
                                   { minimumFractionDigits: dp, maximumFractionDigits: dp });
    case UNIT.COUNT:        return Math.round(value).toLocaleString('en-US');
    case UNIT.SCORE:
    case UNIT.POINTS:
    default:                return round(value, dp).toFixed(dp);
  }
}

/** Seconds -> 'm:ss' or 'h:mm:ss'. AHT is stored in seconds, never as text. */
function formatDuration(seconds) {
  if (seconds == null || !isFinite(seconds)) return '—';
  const total = Math.round(seconds);
  const sign = total < 0 ? '-' : '';
  const abs = Math.abs(total);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  return sign + (h > 0 ? h + ':' + pad2(m) : String(m)) + ':' + pad2(s);
}

/** Escape user-supplied text before it reaches innerHTML. */
function escapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Chunk an array for batched writes. */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
