from pathlib import Path


def test_smart_inventory_dag_imports_without_errors(monkeypatch, tmp_path):
    project_root = Path(__file__).resolve().parents[3]
    airflow_home = tmp_path / "airflow"
    airflow_home.mkdir()
    monkeypatch.setenv("AIRFLOW_HOME", str(airflow_home))
    monkeypatch.setenv(
        "AIRFLOW__DATABASE__SQL_ALCHEMY_CONN",
        f"sqlite:///{airflow_home / 'airflow.db'}",
    )
    monkeypatch.setenv("SMART_INVENTORY_PROJECT_ROOT", str(project_root))

    from airflow.models import DagBag

    dag_bag = DagBag(
        dag_folder=str(project_root / "analytics/airflow/dags"),
        include_examples=False,
    )
    assert dag_bag.import_errors == {}
    dag = dag_bag.dags.get("smart_inventory_daily_analytics")
    assert dag is not None
    expected = {
        "check_mysql",
        "extract_operational_tables",
        "generate_or_ingest_campaign_events",
        "run_pyspark_transformations",
        "run_preload_quality_checks",
        "load_snowflake_raw",
        "build_staging_tables",
        "build_dimensions",
        "build_facts",
        "build_marts",
        "run_reconciliation_checks",
        "validate_data_freshness",
        "publish_pipeline_status",
        "send_success_or_failure_alert",
    }
    assert expected == set(dag.task_ids)
