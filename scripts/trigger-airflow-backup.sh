#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/airflow-api.sh
source "${PROJECT_ROOT}/scripts/airflow-api.sh"

DAG_ID="${AIRFLOW_DAG_ID:-smart_inventory_daily_analytics}"
LOCK_FILE="${AIRFLOW_WATCHDOG_LOCK_FILE:-/tmp/smart-inventory-airflow-watchdog.lock}"
MAX_RECENT_HOURS="${AIRFLOW_EXPECTED_RUN_HOURS:-30}"

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "watchdog lock is already held; skipping backup trigger"
  exit 0
fi

runs_json="$(airflow_api GET "/api/v2/dags/${DAG_ID}/dagRuns?limit=10&order_by=-logical_date")"
should_trigger="$(RUNS_JSON="$runs_json" python - "$MAX_RECENT_HOURS" <<'PY'
import json
import os
import sys
from datetime import datetime, timezone

max_hours = float(sys.argv[1])
data = json.loads(os.environ["RUNS_JSON"])
runs = data.get("dag_runs") or []
now = datetime.now(timezone.utc)
for run in runs:
    if run.get("state") in {"queued", "running"}:
        print("false")
        raise SystemExit
    value = run.get("logical_date") or run.get("start_date")
    if not value:
        continue
    timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if (now - timestamp.astimezone(timezone.utc)).total_seconds() <= max_hours * 3600:
        print("false")
        raise SystemExit
print("true")
PY
)"

if [[ "$should_trigger" != "true" ]]; then
  echo "a recent or active DAG run exists; backup trigger not required"
  exit 0
fi

logical_date="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
run_id="manual__cron_watchdog__$(date -u +%Y%m%dT%H%M%SZ)"
payload="$(jq -n --arg run_id "$run_id" --arg logical_date "$logical_date" \
  '{dag_run_id:$run_id,logical_date:$logical_date,conf:{triggered_by:"cron_watchdog"}}')"

airflow_api POST "/api/v2/dags/${DAG_ID}/dagRuns" "$payload"
echo "triggered backup DAG run ${run_id}"
