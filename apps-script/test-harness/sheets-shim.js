/* In-memory SpreadsheetApp, enough to exercise the whole server stack:
   setup -> config -> periods -> targets -> submit -> rollup -> dashboard. */

function makeSheet(name) {
  const grid = [];               // grid[r][c], 0-indexed
  function ensure(r, c) {
    while (grid.length < r) grid.push([]);
    for (let i = 0; i < grid.length; i++) {
      while (grid[i].length < c) grid[i].push('');
    }
  }
  const sheet = {
    _name: name,
    _grid: grid,
    getName: function () { return name; },
    getMaxRows: function () { return Math.max(grid.length, 1); },
    getMaxColumns: function () {
      return Math.max.apply(null, [1].concat(grid.map(function (r) { return r.length; })));
    },
    getLastRow: function () {
      let last = 0;
      for (let r = 0; r < grid.length; r++) {
        if (grid[r].some(function (v) { return v !== '' && v !== null && v !== undefined; })) {
          last = r + 1;
        }
      }
      return last;
    },
    getLastColumn: function () {
      let last = 0;
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c] !== '' && grid[r][c] !== null && grid[r][c] !== undefined) {
            last = Math.max(last, c + 1);
          }
        }
      }
      return last;
    },
    getRange: function (row, col, numRows, numCols) {
      const nR = numRows == null ? 1 : numRows;
      const nC = numCols == null ? 1 : numCols;
      ensure(row + nR - 1, col + nC - 1);
      return {
        getValues: function () {
          const out = [];
          for (let r = 0; r < nR; r++) {
            const line = [];
            for (let c = 0; c < nC; c++) {
              const v = grid[row - 1 + r] ? grid[row - 1 + r][col - 1 + c] : '';
              line.push(v === undefined ? '' : v);
            }
            out.push(line);
          }
          return out;
        },
        setValues: function (values) {
          for (let r = 0; r < values.length; r++) {
            ensure(row + r, col + values[r].length - 1);
            for (let c = 0; c < values[r].length; c++) {
              grid[row - 1 + r][col - 1 + c] = values[r][c];
            }
          }
          return this;
        },
        clearContent: function () {
          for (let r = 0; r < nR; r++) {
            for (let c = 0; c < nC; c++) {
              if (grid[row - 1 + r]) grid[row - 1 + r][col - 1 + c] = '';
            }
          }
          return this;
        },
        setFontWeight: function () { return this; }
      };
    },
    setFrozenRows: function () { return sheet; },
    hideSheet: function () { return sheet; },
    deleteRow: function (n) { grid.splice(n - 1, 1); return sheet; }
  };
  return sheet;
}

const _sheets = [];
const _book = {
  getSheetByName: function (n) {
    return _sheets.filter(function (s) { return s.getName() === n; })[0] || null;
  },
  getSheets: function () { return _sheets.slice(); },
  insertSheet: function (n) { const s = makeSheet(n); _sheets.push(s); return s; },
  getUrl: function () { return 'shim://spreadsheet'; },
  getId: function () { return 'shim-id'; }
};

globalThis.SpreadsheetApp = {
  getActiveSpreadsheet: function () { return _book; },
  openById: function () { return _book; },
  create: function () { return _book; },
  getUi: function () {
    return { createMenu: function () {
      const m = { addItem: function () { return m; }, addSeparator: function () { return m; },
                  addToUi: function () {} };
      return m;
    }, alert: function () {} };
  }
};
