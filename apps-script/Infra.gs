/**
 * Infra.gs
 * -----------------------------------------------------------------------------
 * Cross-cutting infrastructure: logging, caching, locking, timing.
 *
 * Sheets has no transactions. Two analysts submitting the same period at the
 * same instant can interleave their appends and produce a phantom row. Every
 * write therefore goes through withLock(), and every fact carries an
 * idempotency key so a retry is a no-op rather than a duplicate.
 */

// ----------------------------------------------------------------- logging

const Log = (function () {

  function write(level, context, message, stack) {
    try {
      Repository.insert(TABLE.ERROR, {
        error_id: uid('err'),
        level: level,
        context: context,
        message: String(message).slice(0, 2000),
        stack: String(stack || '').slice(0, 4000),
        actor: Auth.currentUser(),
        at: nowIso()
      });
    } catch (e) {
      // Logging must never break the caller.
      console.error('Log write failed: ' + e);
    }
    console.log('[' + level + '] ' + context + ': ' + message);
  }

  return {
    info: function (context, message) { console.log('[INFO] ' + context + ': ' + message); },
    warn: function (context, message) { write('WARN', context, message, ''); },
    error: function (context, err) {
      write('ERROR', context, err && err.message ? err.message : err, err && err.stack);
    }
  };
})();

// ------------------------------------------------------------------ cache

/**
 * CacheService wrapper with a version stamp.
 *
 * Config tables are read on almost every request and change rarely, so they are
 * cached aggressively. Any config write bumps the global version, which
 * invalidates every derived key at once — no per-key bookkeeping, no stale
 * config after an edit.
 *
 * Datasets are deliberately NOT cached: CacheService caps at ~100KB per key,
 * which a fact slice blows through immediately. Materialised tables are the
 * answer to read performance, not the cache.
 */
const Cache = (function () {

  const VERSION_PROP = 'config_version';
  const TTL = 1800; // 30 min; a version bump invalidates sooner in practice

  function version() {
    const p = PropertiesService.getScriptProperties();
    let v = p.getProperty(VERSION_PROP);
    if (!v) { v = '1'; p.setProperty(VERSION_PROP, v); }
    return v;
  }

  function bump() {
    const p = PropertiesService.getScriptProperties();
    p.setProperty(VERSION_PROP, String(Number(version()) + 1));
  }

  function key(name) { return 'v' + version() + ':' + name; }

  function get(name) {
    try {
      const raw = CacheService.getScriptCache().get(key(name));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function put(name, value) {
    try {
      const raw = JSON.stringify(value);
      if (raw.length > PLATFORM_LIMITS.CACHE_MAX_BYTES_PER_KEY) return false;
      CacheService.getScriptCache().put(key(name), raw, TTL);
      return true;
    } catch (e) { return false; }
  }

  /** Read-through memoisation. */
  function remember(name, producer) {
    const hit = get(name);
    if (hit !== null) return hit;
    const value = producer();
    put(name, value);
    return value;
  }

  return { get: get, put: put, remember: remember, invalidate: bump, version: version };
})();

// ------------------------------------------------------------------- lock

/**
 * Serialise a write. Sheets offers no transaction; this is the substitute.
 * Read paths never take the lock — they would serialise the whole dashboard.
 *
 * RE-ENTRANT. Composite operations legitimately nest: seeding a starter
 * configuration calls saveLob, then save (period), then saveTarget — each of
 * which locks. Without depth tracking the first inner call's `finally` would
 * release the lock while the outer operation was still running, which is worse
 * than not locking at all, because it looks like it works.
 */
let __lockDepth = 0;

function withLock(fn) {
  if (__lockDepth > 0) {
    // Already inside a locked section on this execution — just run.
    __lockDepth++;
    try { return fn(); } finally { __lockDepth--; }
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(PLATFORM_LIMITS.LOCK_WAIT_MS)) {
    throw new AppError('BUSY',
      'Another change is being saved right now. Please try again in a moment.');
  }
  __lockDepth = 1;
  try {
    return fn();
  } finally {
    __lockDepth = 0;
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------- errors

/**
 * Errors that are safe to show a user verbatim. Anything else is logged and
 * surfaced as a generic message, so internal detail never leaks to the client.
 */
function AppError(code, message, details) {
  this.name = 'AppError';
  this.code = code;
  this.message = message;
  this.details = details || null;
  this.userFacing = true;
}
AppError.prototype = Object.create(Error.prototype);

// ---------------------------------------------------------------- timing

/**
 * Budget guard for chunked jobs. Apps Script kills an execution at 6 minutes
 * with no warning, so long jobs checkpoint a cursor and resume on the next run
 * rather than losing the work.
 */
function Budget() {
  const started = Date.now();
  return {
    elapsed: function () { return Date.now() - started; },
    exhausted: function () { return Date.now() - started > PLATFORM_LIMITS.SAFE_RUNTIME_MS; }
  };
}

/** Record a job run for the admin health panel. */
function recordJob(name, fn) {
  const started = Date.now();
  const jobId = uid('job');
  let status = 'SUCCESS', message = '', rows = 0, cursor = '';
  try {
    const result = fn() || {};
    rows = result.rows || 0;
    cursor = result.cursor || '';
    status = result.status || 'SUCCESS';
    message = result.message || '';
    return result;
  } catch (e) {
    status = 'FAILED';
    message = e.message;
    Log.error('job:' + name, e);
    throw e;
  } finally {
    try {
      Repository.insert(TABLE.JOB, {
        job_id: jobId, job_name: name, status: status,
        rows_processed: rows, duration_ms: Date.now() - started,
        cursor: cursor, message: message,
        started_at: new Date(started).toISOString(), finished_at: nowIso()
      });
    } catch (e) { /* never let bookkeeping fail a job */ }
  }
}
