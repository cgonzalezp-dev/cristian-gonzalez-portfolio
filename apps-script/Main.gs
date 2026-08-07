/**
 * Main.gs
 * -----------------------------------------------------------------------------
 * Web app entry point and spreadsheet menu.
 */

/**
 * Serve the single-page app.
 * @param {!Object} e
 * @return {!HtmlOutput}
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  template.initialRoute = (e && e.parameter && e.parameter.view) || 'dashboard';

  return template.evaluate()
    .setTitle(APP.NAME)
    .setFaviconUrl('https://www.gstatic.com/images/branding/product/1x/sheets_2020q4_48dp.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Inline another HTML file. Used to compose the single served page from
 * separate style/script/view files without an external request.
 * @param {string} filename
 * @return {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** Menu inside the container spreadsheet, for admin tasks. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(APP.SHORT_NAME)
    .addItem('Open platform', 'showSidebar')
    .addSeparator()
    .addItem('Run first-time setup', 'menuSetup')
    .addItem('Rebuild all rollups', 'menuRebuild')
    .addItem('Load starter configuration', 'menuSeed')
    .addToUi();
}

function showSidebar() {
  const html = HtmlService.createTemplateFromFile('Index');
  html.initialRoute = 'dashboard';
  SpreadsheetApp.getUi().showSidebar(
    html.evaluate().setTitle(APP.NAME));
}

function menuSetup() {
  const result = Bootstrap.setup();
  SpreadsheetApp.getUi().alert(
    'Setup complete.\n\n' + result.tables + ' tables ready, schema version ' +
    result.schemaVersion + '.\n\nOpen the web app to configure lines of business ' +
    'and metrics.');
}

function menuRebuild() {
  const r = MaterializedViews.rebuildAll('');
  SpreadsheetApp.getUi().alert(
    'Rebuild ' + r.status.toLowerCase() + '. ' + r.rows + ' rollups computed.' +
    (r.cursor ? '\n\nTime budget reached — run again to continue.' : ''));
}

function menuSeed() {
  try {
    const r = Bootstrap.seedStarterConfig();
    SpreadsheetApp.getUi().alert(
      'Starter configuration loaded:\n' + r.lobs + ' lines of business, ' +
      r.metrics + ' metrics, ' + r.periods + ' weekly periods, ' +
      r.targets + ' targets.\n\nNo performance data was created.');
  } catch (e) {
    SpreadsheetApp.getUi().alert(e.message);
  }
}

/**
 * One-time installer for a standalone (non-container-bound) deployment: creates
 * the backing spreadsheet and records its id.
 */
function installStandalone() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('spreadsheet_id')) {
    return 'Already installed: ' + props.getProperty('spreadsheet_id');
  }
  const ss = SpreadsheetApp.create(APP.NAME + ' — Data');
  props.setProperty('spreadsheet_id', ss.getId());
  Bootstrap.setup();
  return ss.getUrl();
}
