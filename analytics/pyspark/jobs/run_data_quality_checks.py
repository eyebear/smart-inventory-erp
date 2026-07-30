#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import date

from pyspark.sql import functions as F

from analytics.pyspark.jobs.common import path_for, spark


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--business-date", type=date.fromisoformat, default=date.today())
    return parser.parse_args()


def metric(name: str, value: int, status: str, business_date: date):
    return (business_date, name, int(value), status)


def main() -> int:
    args = parse_args()
    session = spark("smart-inventory-data-quality")
    curated = path_for("curated")
    quarantine_path = path_for("quarantine") / "campaign_events" / f"run_date={args.business_date.isoformat()}"

    events = session.read.parquet(str(curated / "campaign_daily_performance"))
    inventory = session.read.parquet(str(curated / "inventory_daily_snapshot"))
    quarantine = session.read.parquet(str(quarantine_path))
    event_day = events.filter(F.col("event_date") == F.lit(args.business_date.isoformat()).cast("date"))
    inventory_day = inventory.filter(F.col("snapshot_date") == F.lit(args.business_date.isoformat()).cast("date"))

    metrics = [
        metric("campaign_daily_row_count", event_day.count(), "PASS" if event_day.count() > 0 else "FAIL", args.business_date),
        metric("inventory_snapshot_row_count", inventory_day.count(), "PASS" if inventory_day.count() > 0 else "FAIL", args.business_date),
        metric("quarantined_campaign_event_count", quarantine.count(), "WARN" if quarantine.count() > 0 else "PASS", args.business_date),
        metric("negative_inventory_count", inventory_day.filter(F.col("quantity_on_hand") < 0).count(), "FAIL" if inventory_day.filter(F.col("quantity_on_hand") < 0).count() else "PASS", args.business_date),
        metric("missing_campaign_count", event_day.filter(F.col("campaign_external_id").isNull()).count(), "FAIL" if event_day.filter(F.col("campaign_external_id").isNull()).count() else "PASS", args.business_date),
    ]
    schema = "business_date date, check_name string, observed_value long, status string"
    result = session.createDataFrame(metrics, schema=schema)
    result.write.mode("overwrite").partitionBy("business_date").parquet(
        str(path_for("quality") / "pipeline_data_quality_results")
    )
    session.stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
