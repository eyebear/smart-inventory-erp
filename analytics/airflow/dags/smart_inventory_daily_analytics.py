from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import timedelta
from pathlib import Path

import pendulum
from airflow.sdk import dag, get_current_context, task

PROJECT_ROOT = Path(os.environ.get("SMART_INVENTORY_PROJECT_ROOT", "/opt/project"))
DAG_ID = "smart_inventory_daily_analytics"


def _run(command: list[str]) -> None:
    print("running:", " ".join(command))
    subprocess.run(command, cwd=PROJECT_ROOT, check=True)


def _business_date() -> str:
    context = get_current_context()
    return context["logical_date"].date().isoformat()


def _failure_callback(context) -> None:
    task_instance = context.get("task_instance")
    run_id = context.get("run_id", "unknown")
    business_date = context.get("logical_date").date().isoformat()
    message = str(context.get("exception", "Airflow task failed"))
    task_id = getattr(task_instance, "task_id", "unknown")
    command = [
        sys.executable, "-m", "analytics.monitoring.publish_pipeline_status",
        "--run-id", run_id, "--dag-id", DAG_ID, "--business-date", business_date,
        "--status", "FAILED", "--error-message", f"{task_id}: {message}"[:1000],
    ]
    alert_command = [
        sys.executable, "-m", "analytics.monitoring.alerting",
        "--alert-key", f"AIRFLOW_TASK_FAILURE:{run_id}:{task_id}",
        "--alert-class", "TECHNICAL", "--alert-type", "AIRFLOW_TASK_FAILURE",
        "--severity", "HIGH", "--message", f"{DAG_ID}.{task_id} failed: {message}"[:1000],
        "--source-run-id", run_id,
    ]
    try:
        _run(command)
        _run(alert_command)
    except Exception as callback_error:
        print(f"failure callback could not publish status: {callback_error}")


DEFAULT_ARGS = {
    "owner": "analytics",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "execution_timeout": timedelta(hours=2),
    "on_failure_callback": _failure_callback,
}


@dag(
    dag_id=DAG_ID,
    description="Daily retail, retail-media, Snowflake, and ThoughtSpot-ready analytics pipeline",
    schedule="0 4 * * *",
    start_date=pendulum.datetime(2025, 8, 1, tz="UTC"),
    catchup=True,
    max_active_runs=1,
    default_args=DEFAULT_ARGS,
    tags=["smart-inventory", "retail-media", "snowflake", "pyspark"],
)
def smart_inventory_daily_analytics():
    @task
    def check_mysql() -> str:
        import mysql.connector

        connection = mysql.connector.connect(
            host=os.environ.get("MYSQL_HOST", "host.docker.internal"),
            port=int(os.environ.get("MYSQL_PORT", "3307")),
            user=os.environ.get("MYSQL_USER", "root"),
            password=os.environ.get("MYSQL_PASSWORD", "abc123456"),
            database=os.environ.get("MYSQL_DATABASE", "smart_inventory_erp"),
            connection_timeout=10,
        )
        try:
            cursor = connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
        finally:
            connection.close()
        return _business_date()

    @task
    def extract_operational_tables(business_date: str) -> str:
        _run([
            sys.executable, "-m", "analytics.pyspark.jobs.extract_mysql_snapshot",
            "--business-date", business_date
        ])
        return business_date

    @task
    def generate_or_ingest_campaign_events(business_date: str) -> str:
        event_dir = PROJECT_ROOT / "analytics/data/generated/campaign_daily_events"
        if not list(event_dir.glob("part-*.csv")):
            if os.environ.get("GENERATE_SYNTHETIC_IF_MISSING", "true").lower() != "true":
                raise FileNotFoundError(f"No campaign event files under {event_dir}")
            _run([
                sys.executable,
                "analytics/data_generator/generate_retail_media_data.py",
                "--output-dir", str(PROJECT_ROOT / "analytics/data/generated"),
                "--rows", os.environ.get("SYNTHETIC_EVENT_ROWS", "3000000")
            ])
        return business_date

    @task
    def run_pyspark_transformations(business_date: str) -> str:
        modules = [
            "analytics.pyspark.jobs.clean_campaign_events",
            "analytics.pyspark.jobs.build_inventory_snapshot",
            "analytics.pyspark.jobs.build_waste_daily_summary",
            "analytics.pyspark.jobs.build_campaign_daily",
            "analytics.pyspark.jobs.build_promoted_product_risk",
        ]
        for module in modules:
            _run([sys.executable, "-m", module, "--business-date", business_date])
        return business_date

    @task
    def run_preload_quality_checks(business_date: str) -> str:
        _run([
            sys.executable, "-m", "analytics.pyspark.jobs.run_data_quality_checks",
            "--business-date", business_date
        ])
        return business_date

    @task
    def load_snowflake_raw(business_date: str) -> str:
        _run([sys.executable, "-m", "analytics.snowflake.run_sql", "ddl"])
        _run([sys.executable, "-m", "analytics.snowflake.run_sql", "raw"])
        _run([
            sys.executable, "-m", "analytics.snowflake.load_parquet",
            "--business-date", business_date
        ])
        return business_date

    @task
    def build_staging_tables(business_date: str) -> str:
        _run([sys.executable, "-m", "analytics.snowflake.run_sql", "staging"])
        return business_date

    @task
    def build_dimensions(business_date: str) -> str:
        _run([sys.executable, "-m", "analytics.snowflake.run_sql", "curated"])
        return business_date

    @task
    def build_facts(business_date: str) -> str:
        # Dimension and fact SQL are kept in the ordered curated directory;
        # this task verifies the fact layer is queryable after the layer run.
        from analytics.snowflake.connection import connect
        with connect() as connection:
            cursor = connection.cursor()
            cursor.execute("SELECT COUNT(*) FROM CURATED.FACT_CAMPAIGN_DAILY")
            print("fact_campaign_daily rows:", cursor.fetchone()[0])
            cursor.close()
        return business_date

    @task
    def build_marts(business_date: str) -> str:
        _run([sys.executable, "-m", "analytics.snowflake.run_sql", "marts"])
        return business_date

    @task
    def run_reconciliation_checks(business_date: str) -> str:
        _run([
            sys.executable, "-m", "analytics.snowflake.checks", "reconciliation",
            "--business-date", business_date
        ])
        return business_date

    @task
    def validate_data_freshness(business_date: str) -> str:
        _run([
            sys.executable, "-m", "analytics.snowflake.checks", "freshness",
            "--business-date", business_date,
            "--freshness-hours", os.environ.get("DATA_FRESHNESS_HOURS", "36")
        ])
        return business_date

    @task
    def publish_pipeline_status(business_date: str) -> str:
        context = get_current_context()
        _run([
            sys.executable, "-m", "analytics.monitoring.publish_pipeline_status",
            "--run-id", context["run_id"], "--dag-id", DAG_ID,
            "--business-date", business_date, "--status", "SUCCESS"
        ])
        return business_date

    @task
    def send_success_or_failure_alert(business_date: str) -> None:
        context = get_current_context()
        _run([
            sys.executable, "-m", "analytics.monitoring.evaluate_business_alerts",
            "--business-date", business_date, "--run-id", context["run_id"]
        ])
        payload = {
            "type": "PIPELINE_SUCCESS", "dag_id": DAG_ID,
            "business_date": business_date,
            "environment": os.environ.get("SMART_INVENTORY_ENV", "development")
        }
        print(json.dumps(payload))

    date_value = check_mysql()
    extracted = extract_operational_tables(date_value)
    ingested = generate_or_ingest_campaign_events(extracted)
    transformed = run_pyspark_transformations(ingested)
    quality = run_preload_quality_checks(transformed)
    loaded = load_snowflake_raw(quality)
    staged = build_staging_tables(loaded)
    dimensions = build_dimensions(staged)
    facts = build_facts(dimensions)
    marts = build_marts(facts)
    reconciled = run_reconciliation_checks(marts)
    fresh = validate_data_freshness(reconciled)
    published = publish_pipeline_status(fresh)
    send_success_or_failure_alert(published)


smart_inventory_daily_analytics()
