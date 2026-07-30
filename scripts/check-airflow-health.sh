#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/airflow-api.sh
source "${PROJECT_ROOT}/scripts/airflow-api.sh"

DAG_ID="${AIRFLOW_DAG_ID:-smart_inventory_daily_analytics}"
MAX_RECENT_HOURS="${AIRFLOW_EXPECTED_RUN_HOURS:-30}"
BACKUP_TRIGGER_ENABLED="${AIRFLOW_BACKUP_TRIGGER_ENABLED:-true}"

emit_technical_alert() {
  local alert_type="$1"
  local severity="$2"
  local message="$3"
  if command -v python >/dev/null 2>&1; then
    PYTHONPATH="${PROJECT_ROOT}" python -m analytics.monitoring.alerting \
      --alert-key "${alert_type}:$(date -u +%Y-%m-%d)" \
      --alert-class TECHNICAL \
      --alert-type "$alert_type" \
      --severity "$severity" \
      --message "$message" || true
  fi
}

if ! health_json="$(airflow_api GET "/api/v2/monitor/health")"; then
  emit_technical_alert "AIRFLOW_HEALTH_FAILURE" "CRITICAL" "Airflow health endpoint is unreachable"
  if [[ "$BACKUP_TRIGGER_ENABLED" == "true" ]]; then
    "${PROJECT_ROOT}/scripts/trigger-airflow-backup.sh" || true
  fi
  exit 1
fi

echo "$health_json" | jq . >/dev/null

if ! runs_json="$(airflow_api GET "/api/v2/dags/${DAG_ID}/dagRuns?limit=5&order_by=-logical_date")"; then
  emit_technical_alert "AIRFLOW_DAG_STATUS_FAILURE" "HIGH" "Unable to query recent DAG runs for ${DAG_ID}"
  exit 1
fi

status="$(RUNS_JSON="$runs_json" python - "$MAX_RECENT_HOURS" <<'PY'
import json
import os
import sys
from datetime import datetime, timezone

max_hours = float(sys.argv[1])
data = json.loads(os.environ["RUNS_JSON"])
runs = data.get("dag_runs") or []
if not runs:
    print("MISSING")
    raise SystemExit
latest = runs[0]
value = latest.get("logical_date") or latest.get("start_date")
if not value:
    print("MISSING")
    raise SystemExit
timestamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
age = (datetime.now(timezone.utc) - timestamp.astimezone(timezone.utc)).total_seconds() / 3600
state = str(latest.get("state", "unknown")).upper()
if state == "FAILED":
    print("FAILED")
elif age > max_hours:
    print("STALE")
else:
    print("HEALTHY")
PY
)"

case "$status" in
  HEALTHY)
    echo "Airflow and ${DAG_ID} are healthy"
    ;;
  FAILED)
    emit_technical_alert "AIRFLOW_DAG_FAILURE" "HIGH" "Latest ${DAG_ID} run failed"
    exit 1
    ;;
  STALE|MISSING)
    emit_technical_alert "MISSING_DAILY_PARTITION" "HIGH" "No recent successful or active ${DAG_ID} run"
    if [[ "$BACKUP_TRIGGER_ENABLED" == "true" ]]; then
      "${PROJECT_ROOT}/scripts/trigger-airflow-backup.sh"
    fi
    ;;
  *)
    emit_technical_alert "AIRFLOW_WATCHDOG_UNKNOWN" "WARNING" "Unexpected watchdog status: ${status}"
    exit 1
    ;;
esac
