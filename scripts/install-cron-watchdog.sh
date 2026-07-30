#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CRON_INTERVAL="${CRON_INTERVAL:-*/15 * * * *}"
LOG_FILE="${AIRFLOW_WATCHDOG_LOG:-${PROJECT_ROOT}/analytics/data/quality/airflow-watchdog.log}"
MARKER="# smart-inventory-airflow-watchdog"
mkdir -p "$(dirname "$LOG_FILE")"

command="cd '${PROJECT_ROOT}' && set -a && if [ -f .env.analytics ]; then . ./.env.analytics; fi && set +a && '${PROJECT_ROOT}/scripts/check-airflow-health.sh' >> '${LOG_FILE}' 2>&1"
existing="$(crontab -l 2>/dev/null || true)"
filtered="$(printf '%s\n' "$existing" | grep -vF "$MARKER" || true)"
{
  printf '%s\n' "$filtered"
  printf '%s %s %s\n' "$CRON_INTERVAL" "$command" "$MARKER"
} | sed '/^[[:space:]]*$/d' | crontab -

echo "installed watchdog cron entry: ${CRON_INTERVAL}"
echo "Airflow remains the primary scheduler; cron only checks health and conditionally triggers recovery."
