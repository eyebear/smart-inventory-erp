# Airflow Cron Watchdog

Airflow is the only normal scheduler for `smart_inventory_daily_analytics`.
Cron does not launch an independent daily pipeline. It checks Airflow health and the age/state of recent DAG runs.

If the expected run is missing or stale, the watchdog:

1. Persists a technical alert.
2. Acquires a lock to prevent duplicate recovery requests.
3. Verifies again that there is no recent or active DAG run.
4. Triggers one manual recovery run through the Airflow API.

## Install

```bash
cp .env.analytics.example .env.analytics
./scripts/install-cron-watchdog.sh
```

The default check frequency is every 15 minutes. Override it with `CRON_INTERVAL`.

## Authentication

Set either:

- `AIRFLOW_API_TOKEN`, or
- `AIRFLOW_USERNAME` and `AIRFLOW_PASSWORD`

The scripts use the Airflow stable REST API and do not access the Airflow metadata database directly.
