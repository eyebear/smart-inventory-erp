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


def main() -> int:
    args = parse_args()
    session = spark("smart-inventory-build-waste-summary")
    base = path_for("raw") / "mysql"
    partition = f"snapshot_date={args.business_date.isoformat()}"
    waste = session.read.parquet(str(base / "waste_records" / partition)).alias("w")
    batches = session.read.parquet(str(base / "inventory_batches" / partition)).alias("b")
    products = session.read.parquet(str(base / "products" / partition)).alias("p")

    result = (
        waste.join(batches, F.col("w.batch_id") == F.col("b.id"))
        .join(products, F.col("b.product_id") == F.col("p.id"))
        .groupBy(
            F.col("w.waste_date"), F.col("b.store_id"), F.col("b.product_id"),
            F.col("p.sku"), F.col("p.category"), F.col("w.waste_reason")
        )
        .agg(
            F.sum("w.quantity_wasted").alias("quantity_wasted"),
            F.sum("w.estimated_loss").alias("estimated_loss")
        )
    )
    result.write.mode("overwrite").partitionBy("waste_date").parquet(
        str(path_for("curated") / "waste_daily_summary")
    )
    session.stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
