#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from analytics.pyspark.jobs.common import path_for
from analytics.snowflake.connection import connect

DATASETS = {
    "raw_products": lambda d: path_for("raw") / "mysql" / "products" / f"snapshot_date={d}",
    "raw_stores": lambda d: path_for("raw") / "mysql" / "stores" / f"snapshot_date={d}",
    "raw_suppliers": lambda d: path_for("raw") / "mysql" / "suppliers" / f"snapshot_date={d}",
    "raw_inventory_batches": lambda d: path_for("raw") / "mysql" / "inventory_batches" / f"snapshot_date={d}",
    "raw_inventory_movements": lambda d: path_for("raw") / "mysql" / "inventory_movements" / f"snapshot_date={d}",
    "raw_waste_records": lambda d: path_for("raw") / "mysql" / "waste_records" / f"snapshot_date={d}",
    "raw_campaign_events": lambda d: path_for("curated") / "clean_campaign_events" / f"event_date={d}",
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--business-date", required=True)
    parser.add_argument("--dataset", choices=DATASETS)
    args = parser.parse_args()
    selected = [args.dataset] if args.dataset else list(DATASETS)

    with connect() as connection:
        cursor = connection.cursor()
        try:
            cursor.execute("USE SCHEMA RAW")
            for table in selected:
                path = DATASETS[table](args.business_date)
                files = sorted(path.rglob("*.parquet"))
                if not files:
                    raise FileNotFoundError(f"No Parquet files found for {table}: {path}")
                stage_path = f"@RAW.ANALYTICS_STAGE/{table}/business_date={args.business_date}"
                cursor.execute(f"REMOVE {stage_path}")
                for file_path in files:
                    cursor.execute(
                        f"PUT 'file://{file_path.resolve()}' {stage_path} "
                        "AUTO_COMPRESS=FALSE OVERWRITE=TRUE"
                    )
                cursor.execute(
                    f"COPY INTO RAW.{table} FROM {stage_path} "
                    "FILE_FORMAT=(FORMAT_NAME=RAW.ANALYTICS_PARQUET) "
                    "MATCH_BY_COLUMN_NAME=CASE_INSENSITIVE PURGE=FALSE"
                )
                print(f"loaded {table} from {len(files)} parquet files")
        finally:
            cursor.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
