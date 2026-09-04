# Deployment and operations

## Option A — bound to a spreadsheet (recommended)

1. Create a new Google Sheet. Name it something like *Operations Performance Platform — Data*.
2. **Extensions → Apps Script.**
3. Create every file from `apps-script/`:
   - `.gs` files → **Script**
   - `.html` files → **HTML**
   - Replace the contents of `appsscript.json` (visible via **Project Settings → Show `appsscript.json`**)
   - Names must match exactly — `include()` and `HtmlService` resolve by filename.
4. **Save**, then reload the spreadsheet. An **OPP** menu appears.
5. **OPP → Run first-time setup.** Authorise when prompted. This creates every tab, seeds default settings, and installs the nightly rebuild trigger.
6. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone within \<your organisation\>** (or *Only myself* while testing)
7. Open the web app URL.

### With clasp

```bash
npm install -g @google/clasp
clasp login
clasp clone <SCRIPT_ID>       # or: clasp create --type sheets
cp apps-script/* .            # keep the file names
clasp push
clasp deploy --description "v1.0.0"
```

`clasp` maps `.gs` → server and `.html` → client automatically.

## Option B — standalone

Use this when the data should live in a spreadsheet nobody browses directly.

1. Create a standalone Apps Script project at [script.google.com](https://script.google.com).
2. Add all files as above.
3. Run `installStandalone()` once. It creates the backing spreadsheet, records its id in Script Properties, and runs setup. The function returns the new spreadsheet's URL.
4. Deploy as a web app.

---

## First run

Opening the app before anything is configured shows a **setup checklist**, not an empty dashboard full of zeroes.

**Load a starter configuration** creates:
- 2 example lines of business
- 4 metrics spanning different data types — a proportion, a duration, a count
- 13 weekly periods ending at the current week
- 3 global targets

It deliberately creates **no performance data**. Invented numbers in a real deployment are worse than an empty screen: somebody will screenshot them.

### Manual setup order

1. **Configuration → Lines of business** — create your operational units.
2. **Configuration → Metrics** — for each: name, definition, data type, direction of success, and (if it is a ratio) the numerator/denominator labels.
3. **Configuration → Reporting periods** — *Generate a run* creates a series in one step. Labels follow a pattern (`Week {week}`, `{month} {year}`, `{quarter} {year}`, `{month} W{n}`) and every generated period is an ordinary editable row you can rename afterwards.
4. **Configuration → Targets** — scope them globally or per LOB/team/manager/agent. Set *Effective from* to the start of the period they should first apply to.
5. **Configuration → Agents & org** — only needed for agent-level entry. Managers are recognised by email and get the manager role automatically.
6. **Data entry** — submit values.

---

## Access model

| Role | Config | Entry | Analytics | Admin |
|---|---|---|---|---|
| `ADMIN` | ✅ | ✅ | ✅ | ✅ |
| `MANAGER` | — | ✅ | ✅ | — |
| `ANALYST` | — | ✅ | ✅ | — |
| `VIEWER` | — | — | ✅ | — |

- Admins: the `admin_emails` setting (comma-separated). On a fresh install, the deploying user.
- Managers: recognised by the email on their `dim_manager` record.
- Everyone else: the `default_role` setting, initially `VIEWER`.

### ⚠️ Sheets has no row-level access control

This model authorises **features**, not **rows**. Anyone who can open the underlying spreadsheet can read every row in it, whatever the app says. If the data is sensitive:

- Do **not** share the spreadsheet with end users.
- Deploy the web app as **"Execute as: Me"**, so only the app account touches the sheet.
- Users then interact only through the app, which enforces capabilities.

---

## Operations

### Nightly rebuild

`Bootstrap.installTriggers()` schedules `nightlyRebuildTrigger` at 03:00 in the script's timezone. It recomputes every rollup from facts + config.

The job is **chunked and resumable**: on reaching the safe runtime ceiling (4m30s of the 6-minute limit) it saves a period cursor to Script Properties and returns `PARTIAL`. The next run picks up where it stopped. Runs are recorded in `sys_job_run` and shown in Configuration → System.

### Manual rebuild

**Configuration → System → Rebuild**, or **OPP → Rebuild all rollups** from the spreadsheet menu.

Run one after:
- bulk-editing facts directly in the sheet (not recommended, but it happens)
- changing an aggregation rule or direction of success on an existing metric
- back-dating a target

### Health monitoring

Configuration → System shows live fact-row count against the migration threshold, spreadsheet cell usage, year partitions, and recent job runs. When a threshold trips, a warning appears explaining that the data-access layer is already an interface and migrating replaces one module.

### Backups

Sheets keeps full version history (**File → Version history**). For a stronger guarantee, schedule a copy of the spreadsheet — the `fact_metric_value_YYYY` tabs are the only irreplaceable data; everything in `agg_*` rebuilds from them.

---

## Upgrading

1. Push the new files.
2. Bump `APP.SCHEMA_VERSION` in `Constants.gs` if `Schema.gs` changed.
3. Run **OPP → Run first-time setup** (it is idempotent) or call `Bootstrap.migrate()`.
4. Create a new web-app deployment version.

**Migrations are additive only.** A new column declared in `Schema.gs` is appended to the live sheet; nothing is renamed, reordered or dropped by an upgrade. `Repository` maps columns by header name rather than position, so even a manually reordered sheet keeps reading correctly.

---

## Versioning

Semantic versioning in `APP.VERSION`:

| Bump | When |
|---|---|
| **Major** | A change requiring manual data migration |
| **Minor** | New capability, backward-compatible schema addition |
| **Patch** | Fixes, copy, styling |

`APP.SCHEMA_VERSION` is a separate integer, bumped only when `Schema.gs` changes. Applied versions are recorded in `sys_schema_version` with the columns each migration added.

Tag deployments with the version in the description (`clasp deploy --description "v1.1.0"`) so the Apps Script deployment list matches the source history.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| *"Could not start the application"* | Setup never ran | **OPP → Run first-time setup** |
| *"Another change is being saved right now"* | Lock contention | Retry. Persistent contention means concurrent editors is near its ceiling |
| Dashboard shows nothing after submitting | Rollups not refreshed | **Configuration → System → Rebuild** |
| A value saved but shows no status | No target resolves for that metric/scope/date | Add a target with a `valid_from` on or before the period start |
| Period appears in the wrong order | Wrong `start_date` | Ordering is always by date; fix the date, not the label |
| *"That date range overlaps…"* | Two periods of one frequency covering the same day | Adjust the dates — the overlap would double-count every rollup |
| Rebuild returns `PARTIAL` | Hit the runtime ceiling | Expected on large datasets. Run again; it resumes from the cursor |
| Aggregate badged **unweighted** | Some contributors lack a denominator | Supply denominators, or accept that contributors carry equal weight |

Errors are written to `sys_error_log` with a stack trace. Users see a generic message; the detail stays server-side.
