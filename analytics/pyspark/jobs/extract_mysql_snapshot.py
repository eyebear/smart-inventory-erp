#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

import mysql.connector
from pyspark.sql.types import (
    DateType,
    DecimalType,
    IntegerType,
    LongType,
    StringType,
    StructField,
    StructType,
    TimestampType,
)

from analytics.pyspark.jobs.common import path_for, spark

TABLES = {
    "stores": [
        ("id", IntegerType(), False), ("name", StringType(), False),
        ("city", StringType(), False), ("address", StringType(), True),
        ("created_at", TimestampType(), True)
    ],
    "suppliers": [
        ("id", IntegerType(), False), ("name", StringType(), False),
        ("country", StringType(), True), ("contact_email", StringType(), True),
        ("created_at", TimestampType(), True)
    ],
    "products": [
        ("id", IntegerType(), False), ("sku", StringType(), False),
        ("name_en", StringType(), False), ("name_zh", StringType(), True),
        ("category", StringType(), False), ("origin_country", StringType(), True),
        ("supplier_id", IntegerType(), True), ("unit_cost", DecimalType(18, 2), False),
        ("created_at", TimestampType(), True)
    ],
    "inventory_batches": [
        ("id", IntegerType(), False), ("product_id", IntegerType(), False),
        ("store_id", IntegerType(), False), ("batch_code", StringType(), False),
        ("quantity", IntegerType(), False), ("expiry_date", DateType(), True),
        ("received_date", DateType(), False), ("created_at", TimestampType(), True)
    ],
    "inventory_movements": [
        ("id", LongType(), False), ("batch_id", IntegerType(), False),
        ("movement_type", StringType(), False), ("quantity_change", IntegerType(), False),
        ("reason", StringType(), True), ("created_at", TimestampType(), True)
    ],
    "waste_records": [
        ("id", LongType(), False), ("batch_id", IntegerType(), False),
        ("quantity_wasted", IntegerType(), False), ("waste_reason", StringType(), False),
        ("waste_date", DateType(), False), ("estimated_loss", DecimalType(18, 2), False)
    ],
    "advertisers": [
        ("id", LongType(), False), ("name", StringType(), False),
        ("industry", StringType(), True), ("contact_email", StringType(), True),
        ("created_at", TimestampType(), True)
    ],
    "audience_segments": [
        ("id", LongType(), False), ("name", StringType(), False),
        ("description", StringType(), True), ("created_at", TimestampType(), True)
    ],
    "campaigns": [
        ("id", LongType(), False), ("campaign_code", StringType(), False),
        ("advertiser_id", LongType(), False), ("store_id", IntegerType(), True),
        ("region", StringType(), True), ("channel", StringType(), False),
        ("audience_segment_id", LongType(), True), ("start_date", DateType(), False),
        ("end_date", DateType(), False), ("planned_budget", DecimalType(18, 2), False),
        ("daily_budget", DecimalType(18, 2), False), ("objective", StringType(), False),
        ("status", StringType(), False), ("created_at", TimestampType(), True),
        ("updated_at", TimestampType(), True)
    ],
    "campaign_products": [
        ("campaign_id", LongType(), False), ("product_id", IntegerType(), False),
        ("promoted_sku", StringType(), False), ("created_at", TimestampType(), True)
    ],
    "campaign_budgets": [
        ("id", LongType(), False), ("campaign_id", LongType(), False),
        ("budget_date", DateType(), False), ("planned_daily_budget", DecimalType(18, 2), False),
        ("created_at", TimestampType(), True)
    ],
}


def normalize(value: Any, data_type: Any) -> Any:
    if value is None:
        return None
    if isinstance(data_type, DecimalType) and not isinstance(value, Decimal):
        return Decimal(str(value))
    if isinstance(data_type, DateType) and isinstance(value, datetime):
        return value.date()
    return value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--business-date", type=date.fromisoformat, default=date.today())
    parser.add_argument("--tables", nargs="*", default=list(TABLES))
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    unknown = sorted(set(args.tables) - set(TABLES))
    if unknown:
        raise ValueError(f"Unsupported tables: {unknown}")

    connection = mysql.connector.connect(
        host=os.environ.get("MYSQL_HOST", "127.0.0.1"),
        port=int(os.environ.get("MYSQL_PORT", "3307")),
        user=os.environ.get("MYSQL_USER", "root"),
        password=os.environ.get("MYSQL_PASSWORD", "abc123456"),
        database=os.environ.get("MYSQL_DATABASE", "smart_inventory_erp")
    )
    session = spark("smart-inventory-mysql-snapshot")
    output_root = path_for("raw") / "mysql"
    try:
        for table in args.tables:
            fields = TABLES[table]
            schema = StructType([StructField(name, typ, nullable) for name, typ, nullable in fields])
            cursor = connection.cursor()
            cursor.execute(f"SELECT {', '.join(name for name, _, _ in fields)} FROM {table}")
            raw_rows = cursor.fetchall()
            cursor.close()
            normalized = [
                tuple(normalize(value, fields[index][1]) for index, value in enumerate(row))
                for row in raw_rows
            ]
            dataframe = session.createDataFrame(normalized, schema=schema)
            destination = output_root / table / f"snapshot_date={args.business_date.isoformat()}"
            dataframe.write.mode("overwrite").parquet(str(destination))
            print(f"wrote {dataframe.count()} rows to {destination}")
    finally:
        connection.close()
        session.stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
