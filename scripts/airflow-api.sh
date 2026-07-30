#!/usr/bin/env bash
set -euo pipefail

AIRFLOW_BASE_URL="${AIRFLOW_BASE_URL:-http://localhost:8080}"

# Usage: airflow_api METHOD PATH [JSON_BODY]
airflow_api() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local -a args=(--fail --silent --show-error --request "$method")

  if [[ -n "${AIRFLOW_API_TOKEN:-}" ]]; then
    args+=(--header "Authorization: Bearer ${AIRFLOW_API_TOKEN}")
  elif [[ -n "${AIRFLOW_USERNAME:-}" || -n "${AIRFLOW_PASSWORD:-}" ]]; then
    args+=(--user "${AIRFLOW_USERNAME:-admin}:${AIRFLOW_PASSWORD:-admin}")
  fi

  if [[ -n "$body" ]]; then
    args+=(--header "Content-Type: application/json" --data "$body")
  fi

  curl "${args[@]}" "${AIRFLOW_BASE_URL}${path}"
}
