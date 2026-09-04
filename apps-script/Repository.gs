/**
 * Repository.gs
 * -----------------------------------------------------------------------------
 * The ONLY module in this project that touches SpreadsheetApp.
 *
 * Every engine talks to this interface instead of the spreadsheet. That is what
 * makes the migration path real: when the fact store outgrows Sheets (see
 * MIGRATION_SLO), this one file is reimplemented against BigQuery or Postgres
 * and every engine, calculation and screen keeps working unchanged.
 *
 * Performance rules enforced here:
 *   - Batched I/O only. One getValues()/setValues() per operation. Per-cell
 *     access is the classic Apps Script performance killer.
 *   - Fact tables are partitioned by year (fact_metric_value_2026), so the
 *     current year stays fast as history accumulates.
 *   - Reads are typed via Schema.gs, so callers never deal with raw cell values.
 */

const Repository = (function () {

  /** @return {!Spreadsheet} */
  function book() {
    const id = PropertiesService.getScriptProperties().getProperty('spreadsheet_id');
    return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  }

  /**
   * Resolve a logical table to a physical tab name.
   * Fact tables carry a year suffix; everything else maps 1:1.
   */
  function physicalName(tableName, partition) {
    if (tableName === TABLE.FACT) {
      const year = partition || new Date().getUTCFullYear();
      return tableName + '_' + year;
    }
    return tableName;
  }

  /** @return {Sheet|null} */
  function sheetFor(tableName, partition, createIfMissing) {
    const name = physicalName(tableName, partition);
    const ss = book();
    let sh = ss.getSheetByName(name);
    if (!sh && createIfMissing) {
      sh = ss.insertSheet(name);
      const cols = schemaColumns(tableName);
      sh.getRange(1, 1, 1, cols.length).setValues([cols]);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, cols.length).setFontWeight('bold');
      sh.hideSheet();
      invalidate(tableName, partition);
    }
    return sh;
  }

  /** Coerce a raw cell to its declared type. */
  function coerce(value, type) {
    switch (type) {
      case 'number':   return num(value);
      case 'boolean':  return bool(value);
      case 'date':     return toDateStr(value);
      case 'datetime': return value instanceof Date ? value.toISOString() : str(value);
      case 'json':     return parseJson(value, null);
      default:         return str(value);
    }
  }

  /** Serialise a typed value back to a cell. */
  function serialise(value, type) {
    if (value === null || value === undefined) return '';
    switch (type) {
      case 'number':   return value === '' ? '' : (num(value) === null ? '' : num(value));
      case 'boolean':  return bool(value);
      case 'date':     return toDateStr(value);
      case 'json':     return typeof value === 'string' ? value : JSON.stringify(value);
      default:         return String(value);
    }
  }

  /**
   * Per-execution read cache.
   *
   * A single submission legitimately reads the same fact partition several
   * times: the idempotency lookup, the subject's history, then the rollup
   * refresh. At 130,000 rows a year that is three full getValues() calls for
   * one save, and a bulk grid of 200 agents would make it six hundred.
   *
   * Only the RAW cell values are cached — every readAll still maps fresh
   * objects. Callers routinely decorate rows (adding rank, period_label,
   * gate messages), and sharing mutable objects across calls would let one
   * caller's annotations leak into another's data.
   *
   * Every write invalidates its own table, so a read after a write in the same
   * execution always sees the write.
   */
  let _memo = {};

  function rawRead(tableName, partition) {
    const name = physicalName(tableName, partition);
    if (_memo[name]) return _memo[name];

    const sh = sheetFor(tableName, partition, false);
    if (!sh) return (_memo[name] = { header: [], values: [] });

    const lastRow = sh.getLastRow();
    const lastCol = Math.max(1, sh.getLastColumn());
    if (lastRow < 2) {
      return (_memo[name] = {
        header: sh.getRange(1, 1, 1, lastCol).getValues()[0]
                  .map(function (h) { return String(h).trim(); }),
        values: []
      });
    }
    return (_memo[name] = {
      header: sh.getRange(1, 1, 1, lastCol).getValues()[0]
                .map(function (h) { return String(h).trim(); }),
      values: sh.getRange(2, 1, lastRow - 1, lastCol).getValues()
    });
  }

  function invalidate(tableName, partition) {
    if (!tableName) { _memo = {}; return; }
    delete _memo[physicalName(tableName, partition)];
  }

  /**
   * Read an entire table into typed objects.
   * @param {string} tableName
   * @param {(number|undefined)} partition Year, for fact tables.
   * @return {!Array<!Object>}
   */
  function readAll(tableName, partition) {
    const raw = rawRead(tableName, partition);
    if (!raw.values.length) return [];

    const cols = schemaColumns(tableName);
    const types = schemaTypes(tableName);

    // Map by header name rather than position, so a column added mid-life or
    // a manually reordered sheet cannot silently shift every field.
    const index = {};
    raw.header.forEach(function (h, i) { index[h] = i; });

    const out = new Array(raw.values.length);
    for (let r = 0; r < raw.values.length; r++) {
      const row = raw.values[r];
      const obj = {};
      for (let c = 0; c < cols.length; c++) {
        const name = cols[c];
        const at = index[name];
        obj[name] = at === undefined ? coerce('', types[name]) : coerce(row[at], types[name]);
      }
      obj.__row = r + 2; // physical row, for in-place updates
      if (partition) obj.__partition = partition;
      out[r] = obj;
    }
    return out;
  }

  /**
   * Read facts across one or more year partitions.
   * @param {!Array<number>} years
   * @return {!Array<!Object>}
   */
  function readFactYears(years) {
    let out = [];
    for (let i = 0; i < years.length; i++) {
      out = out.concat(readAll(TABLE.FACT, years[i]));
    }
    return out;
  }

  /** @return {!Array<number>} Years that actually have a fact partition. */
  function factPartitions() {
    const prefix = TABLE.FACT + '_';
    return book().getSheets()
      .map(function (s) { return s.getName(); })
      .filter(function (n) { return n.indexOf(prefix) === 0; })
      .map(function (n) { return Number(n.slice(prefix.length)); })
      .filter(function (y) { return isFinite(y); })
      .sort();
  }

  function insert(tableName, record, partition) {
    return insertMany(tableName, [record], partition)[0];
  }

  /**
   * Append rows in one write. Always prefer this over repeated insert().
   * @return {!Array<!Object>} the records as written
   */
  function insertMany(tableName, records, partition) {
    if (!records.length) return [];
    const sh = sheetFor(tableName, partition, true);
    const cols = schemaColumns(tableName);
    const types = schemaTypes(tableName);

    const rows = records.map(function (rec) {
      return cols.map(function (c) { return serialise(rec[c], types[c]); });
    });

    sh.getRange(sh.getLastRow() + 1, 1, rows.length, cols.length).setValues(rows);
    invalidate(tableName, partition);
    return records;
  }

  /**
   * Patch a single row in place, matched on primary key.
   * @return {!Object|null} the updated record
   */
  function update(tableName, id, patch, partition) {
    const sh = sheetFor(tableName, partition, false);
    if (!sh) return null;
    const cols = schemaColumns(tableName);
    const types = schemaTypes(tableName);
    const keyCol = schemaKey(tableName);

    const all = readAll(tableName, partition);
    const found = all.filter(function (r) { return r[keyCol] === id; })[0];
    if (!found) return null;

    const merged = {};
    cols.forEach(function (c) {
      merged[c] = Object.prototype.hasOwnProperty.call(patch, c) ? patch[c] : found[c];
    });
    const row = cols.map(function (c) { return serialise(merged[c], types[c]); });
    sh.getRange(found.__row, 1, 1, cols.length).setValues([row]);
    invalidate(tableName, partition);
    merged.__row = found.__row;
    return merged;
  }

  /** @return {!Object|null} */
  function findById(tableName, id, partition) {
    const keyCol = schemaKey(tableName);
    const all = readAll(tableName, partition);
    return all.filter(function (r) { return r[keyCol] === id; })[0] || null;
  }

  /** @return {!Array<!Object>} */
  function where(tableName, predicate, partition) {
    return readAll(tableName, partition).filter(predicate);
  }

  /**
   * Replace an entire table's contents in one write. Used only for derived
   * (agg_*) tables, which are rebuildable by definition.
   */
  function replaceAll(tableName, records, partition) {
    const sh = sheetFor(tableName, partition, true);
    const cols = schemaColumns(tableName);
    const types = schemaTypes(tableName);

    const last = sh.getLastRow();
    if (last > 1) sh.getRange(2, 1, last - 1, cols.length).clearContent();
    invalidate(tableName, partition);
    if (!records.length) return 0;

    const rows = records.map(function (rec) {
      return cols.map(function (c) { return serialise(rec[c], types[c]); });
    });
    sh.getRange(2, 1, rows.length, cols.length).setValues(rows);
    invalidate(tableName, partition);
    return rows.length;
  }

  /**
   * Delete rows matching a predicate. Config uses soft delete (status=INACTIVE)
   * so history is never orphaned; this exists for derived tables and for
   * genuinely erroneous fact rows removed by an admin.
   */
  function deleteWhere(tableName, predicate, partition) {
    const sh = sheetFor(tableName, partition, false);
    if (!sh) return 0;
    const all = readAll(tableName, partition);
    const doomed = all.filter(predicate)
                      .map(function (r) { return r.__row; })
                      .sort(function (a, b) { return b - a; }); // bottom-up
    doomed.forEach(function (rowNum) { sh.deleteRow(rowNum); });
    invalidate(tableName, partition);
    return doomed.length;
  }

  /** @return {number} Total data rows across every fact partition. */
  function factRowCount() {
    return factPartitions().reduce(function (total, year) {
      const sh = sheetFor(TABLE.FACT, year, false);
      return total + (sh ? Math.max(0, sh.getLastRow() - 1) : 0);
    }, 0);
  }

  /** Health snapshot for the admin panel — drives the migration SLO warnings. */
  function health() {
    const ss = book();
    let cells = 0;
    ss.getSheets().forEach(function (s) { cells += s.getMaxRows() * s.getMaxColumns(); });
    const factRows = factRowCount();
    return {
      factRows: factRows,
      factRowLimit: MIGRATION_SLO.MAX_LIVE_FACT_ROWS,
      factRowPct: round(factRows / MIGRATION_SLO.MAX_LIVE_FACT_ROWS * 100, 1),
      cells: cells,
      cellLimit: PLATFORM_LIMITS.SHEET_MAX_CELLS,
      cellPct: round(cells / PLATFORM_LIMITS.SHEET_MAX_CELLS * 100, 1),
      partitions: factPartitions(),
      migrationRecommended: factRows > MIGRATION_SLO.MAX_LIVE_FACT_ROWS ||
                            cells > PLATFORM_LIMITS.SHEET_MAX_CELLS * 0.7
    };
  }

  return {
    readAll: readAll,
    readFactYears: readFactYears,
    factPartitions: factPartitions,
    insert: insert,
    insertMany: insertMany,
    update: update,
    findById: findById,
    where: where,
    replaceAll: replaceAll,
    deleteWhere: deleteWhere,
    factRowCount: factRowCount,
    health: health,
    sheetFor: sheetFor,
    physicalName: physicalName,
    invalidate: invalidate
  };
})();
