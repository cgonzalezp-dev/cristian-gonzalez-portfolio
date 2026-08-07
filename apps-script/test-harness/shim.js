/* Minimal Apps Script shim so the pure calculation logic can be exercised
   outside Google's runtime. Sheets are absent, so Repository.readAll returns []
   and ConfigService falls back to DEFAULT_SETTINGS — which is exactly the code
   path we want to verify does not crash. */

let _uuid = 0;
globalThis.Utilities = {
  getUuid: function () { return 'uuid-' + (++_uuid) + '-0000-0000-000000000000'; },
  DigestAlgorithm: { SHA_256: 'SHA_256' },
  computeDigest: function (algo, input) {
    // Deterministic, not cryptographic — only stability matters for the test.
    const out = [];
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < input.length; i++) {
      h1 = (h1 ^ input.charCodeAt(i)) >>> 0;
      h1 = (h1 * 16777619) >>> 0;
      h2 = (h2 + input.charCodeAt(i) * (i + 7)) >>> 0;
    }
    for (let i = 0; i < 32; i++) {
      out.push(((i % 2 ? h1 : h2) >>> ((i % 4) * 8)) & 0xFF);
    }
    return out;
  },
  formatDate: function (date, tz, fmt) {
    const p2 = function (n) { return ('0' + n).slice(-2); };
    if (fmt === 'yyyy-MM-dd') {
      return date.getUTCFullYear() + '-' + p2(date.getUTCMonth() + 1) + '-' +
             p2(date.getUTCDate());
    }
    return date.toISOString();
  }
};

const _props = {};
globalThis.PropertiesService = {
  getScriptProperties: function () {
    return {
      getProperty: function (k) { return _props[k] === undefined ? null : _props[k]; },
      setProperty: function (k, v) { _props[k] = String(v); }
    };
  }
};

globalThis.CacheService = {
  getScriptCache: function () {
    return { get: function () { return null; }, put: function () {} };
  }
};

globalThis.LockService = {
  getScriptLock: function () {
    return { tryLock: function () { return true; }, releaseLock: function () {} };
  }
};

globalThis.Session = {
  getActiveUser: function () { return { getEmail: function () { return 'test@example.com'; } }; },
  getEffectiveUser: function () { return { getEmail: function () { return 'test@example.com'; } }; }
};

globalThis.SpreadsheetApp = {
  getActiveSpreadsheet: function () {
    return {
      getSheetByName: function () { return null; },
      getSheets: function () { return []; },
      insertSheet: function () { throw new Error('shim: insertSheet not supported'); },
      getUrl: function () { return 'shim://spreadsheet'; }
    };
  },
  openById: function () { return SpreadsheetApp.getActiveSpreadsheet(); }
};

globalThis.ScriptApp = {
  getProjectTriggers: function () { return []; },
  newTrigger: function () {
    const t = { timeBased: function () { return t; }, atHour: function () { return t; },
                everyDays: function () { return t; }, create: function () {} };
    return t;
  },
  deleteTrigger: function () {}
};

globalThis.HtmlService = {};
