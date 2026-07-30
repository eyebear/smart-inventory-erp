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
    session = spark("smart-inventory-build-promoted-product-risk")
    campaigns = session.read.parquet(str(path_for("curated") / "campaign_daily_performance"))
    inventory = session.read.parquet(str(path_for("curated") / "inventory_daily_snapshot"))
    generated = path_for("generated")
    campaign_products = session.read.option("header", True).csv(str(generated / "campaign_products.csv"))
    products = session.read.option("header", True).csv(str(generated / "products.csv"))

    mapping = campaign_products.join(products.select("product_external_id", "sku"), "product_external_id")
    risk = (
        campaigns.filter(F.col("event_date") == F.lit(args.business_date.isoformat()).cast("date"))
        .join(mapping, ["campaign_external_id", "product_external_id"], "left")
        .join(
            inventory.filter(F.col("snapshot_date") == F.lit(args.business_date.isoformat()).cast("date")),
            ["sku"],
            "left"
        )
        .withColumn("low_stock_flag", F.coalesce(F.col("quantity_on_hand"), F.lit(0)) < 20)
        .withColumn("expiry_risk_flag", F.coalesce(F.col("expiring_units_7d"), F.lit(0)) > 0)
        .withColumn(
            "risk_reason",
            F.concat_ws(
                ",",
                F.when(F.col("low_stock_flag"), F.lit("LOW_STOCK")),
                F.when(F.col("expiry_risk_flag"), F.lit("EXPIRY_RISK"))
            )
        )
        .select(
            "event_date", "campaign_external_id", "product_external_id", "sku",
            "store_external_id", "impressions", "clicks", "conversions", "spend",
            "attributed_revenue", "roas", "quantity_on_hand", "inventory_value",
            "expiring_units_7d", "expiring_inventory_value_7d", "low_stock_flag",
            "expiry_risk_flag", "risk_reason"
        )
    )
    risk.write.mode("overwrite").partitionBy("event_date").parquet(
        str(path_for("curated") / "promoted_product_inventory_risk")
    )
    session.stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
