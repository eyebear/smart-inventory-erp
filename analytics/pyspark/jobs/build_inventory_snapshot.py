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
    session = spark("smart-inventory-build-inventory-snapshot")
    base = path_for("raw") / "mysql"
    partition = f"snapshot_date={args.business_date.isoformat()}"
    products = session.read.parquet(str(base / "products" / partition))
    batches = session.read.parquet(str(base / "inventory_batches" / partition))
    stores = session.read.parquet(str(base / "stores" / partition))

    snapshot = (
        batches.alias("b")
        .join(products.alias("p"), F.col("b.product_id") == F.col("p.id"), "inner")
        .join(stores.alias("s"), F.col("b.store_id") == F.col("s.id"), "inner")
        .groupBy(
            F.lit(args.business_date.isoformat()).cast("date").alias("snapshot_date"),
            F.col("b.store_id"), F.col("s.name").alias("store_name"),
            F.col("b.product_id"), F.col("p.sku"), F.col("p.name_en"),
            F.col("p.category"), F.col("p.unit_cost")
        )
        .agg(
            F.sum("b.quantity").alias("quantity_on_hand"),
            F.min("b.expiry_date").alias("nearest_expiry_date"),
            F.sum(
                F.when(
                    F.col("b.expiry_date").between(
                        F.lit(args.business_date.isoformat()).cast("date"),
                        F.date_add(F.lit(args.business_date.isoformat()).cast("date"), 7)
                    ),
                    F.col("b.quantity")
                ).otherwise(0)
            ).alias("expiring_units_7d")
        )
        .withColumn("inventory_value", F.col("quantity_on_hand") * F.col("unit_cost"))
        .withColumn("expiring_inventory_value_7d", F.col("expiring_units_7d") * F.col("unit_cost"))
    )
    output = path_for("curated") / "inventory_daily_snapshot"
    snapshot.write.mode("overwrite").partitionBy("snapshot_date").parquet(str(output))
    session.stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
