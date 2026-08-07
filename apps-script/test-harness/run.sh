#!/usr/bin/env bash
#
# Run the platform's server code outside Google Apps Script.
#
# Apps Script has no local runner and no test framework, which normally means
# the only way to find out whether a calculation is right is to deploy it and
# look. This harness stubs the handful of Google services the server touches —
# including an in-memory Sheets implementation — and runs the real modules,
# unmodified, under Node.
#
#   ./run.sh unit   Tests.gs — the calculations that fail silently
#   ./run.sh e2e    A full walk through the API: setup → config → periods →
#                   targets → agents → submissions → rollups → dashboards
#   ./run.sh        Both
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$(dirname "$HERE")"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

# Load order matters: every module is an IIFE that only *defines*, so the one
# requirement is that a const exists before another module calls into it at
# runtime. Nothing reaches across modules at load time.
MODULES=(
  Constants Schema Utils Infra Repository Auth MetricStrategy ConfigService
  PeriodEngine Validation Facts Aggregation DeltaEngine MaterializedViews
  Dashboard InsightEngine ChartConfig Bootstrap Api
)

bundle() {
  local target="$1"; shift
  cat "$HERE/shim.js" "$HERE/sheets-shim.js" > "$target"
  for m in "${MODULES[@]}"; do cat "$SRC/$m.gs" >> "$target"; done
  for extra in "$@"; do cat "$extra" >> "$target"; done
}

run_unit() {
  echo "=== unit (Tests.gs) ==="
  bundle "$OUT/unit.js" "$SRC/Tests.gs"
  echo "runAllTests();" >> "$OUT/unit.js"
  node "$OUT/unit.js"
}

run_e2e() {
  echo "=== end to end ==="
  bundle "$OUT/e2e.js" "$HERE/e2e.js"
  node "$OUT/e2e.js"
}

check_syntax() {
  echo "=== syntax ==="
  for m in "${MODULES[@]}" Tests Main; do
    cp "$SRC/$m.gs" "$OUT/$m.js"
    node --check "$OUT/$m.js" && echo "  ok  $m.gs"
  done
  for c in Components Charts Views ViewsConfig Scripts; do
    sed -e '1d' -e '$d' "$SRC/$c.html" > "$OUT/client-$c.js"
    node --check "$OUT/client-$c.js" && echo "  ok  $c.html"
  done
}

case "${1:-all}" in
  unit)   run_unit ;;
  e2e)    run_e2e ;;
  syntax) check_syntax ;;
  all)    check_syntax; echo; run_unit; echo; run_e2e ;;
  *)      echo "usage: run.sh [unit|e2e|syntax|all]"; exit 1 ;;
esac
