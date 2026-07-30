#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path

from pyspark.sql import Window
from pyspark.sql import functions as F

from analytics.pyspark.jobs.common import path_for, spark
from analytics.pyspark.jobs.schemas import CAMPAIGN_EVENT_CSV_SCHEMA


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--business-date", type=date.fromisoformat, default=date.today())
    parser.add_argument("--input", type=Path)
    return parser.parse_args()


def classify_invalid(df):
    parsed_date = F.to_date("event_date")
    return df.withColumn("parsed_event_date", parsed_date).withColumn(
        "quality_error",
        F.when(F.col("event_id").isNull() | (F.trim("event_id") == ""), "MISSING_EVENT_ID")
        .when(F.col("campaign_external_id").isNull() | (F.trim("campaign_external_id") == ""), "MISSING_CAMPAIGN_ID")
        .when(parsed_date.isNull(), "INVALID_EVENT_DATE")
        .when(F.col("impressions").isNull() | (F.col("impressions") < 0), "INVALID_IMPRESSIONS")
        .when(F.col("clicks").isNull() | (F.col("clicks") < 0), "INVALID_CLICKS")
        .when(F.col("conversions").isNull() | (F.col("conversions") < 0), "INVALID_CONVERSIONS")
        .when(F.col("clicks") > F.col("impressions"), "CLICKS_EXCEED_IMPRESSIONS")
        .when(F.col("conversions") > F.col("clicks"), "CONVERSIONS_EXCEED_CLICKS")
        .when(F.col("spend").isNull() | (F.col("spend") < 0), "NEGATIVE_OR_MISSING_SPEND")
        .when(F.col("attributed_revenue").isNull() | (F.col("attributed_revenue") < 0), "NEGATIVE_OR_MISSING_REVENUE")
    )


def main() -> int:
    args = parse_args()
    session = spark("smart-inventory-clean-campaign-events")
    input_path = args.input or (path_for("generated") / "campaign_daily_events")
    quarantine = path_for("quarantine") / "campaign_events" / f"run_date={args.business_date.isoformat()}"
    valid_output = path_for("curated") / "clean_campaign_events"

    source = (
        session.read.option("header", True)
        .schema(CAMPAIGN_EVENT_CSV_SCHEMA)
        .csv(str(input_path / "part-*.csv"))
    )
    classified = classify_invalid(source)
    invalid = classified.filter(F.col("quality_error").isNotNull())
    candidate = classified.filter(F.col("quality_error").isNull())

    order = Window.partitionBy("event_id").orderBy(F.col("ingested_at").desc_nulls_last())
    ranked = candidate.withColumn("duplicate_rank", F.row_number().over(order))
    duplicates = ranked.filter(F.col("duplicate_rank") > 1).withColumn(
        "quality_error", F.lit("DUPLICATE_EVENT_ID")
    )
    valid = (
        ranked.filter(F.col("duplicate_rank") == 1)
        .drop("duplicate_rank", "event_date", "quality_error")
        .withColumnRenamed("parsed_event_date", "event_date")
        .withColumn("processing_date", F.lit(args.business_date.isoformat()).cast("date"))
    )

    invalid.unionByName(duplicates.select(invalid.columns), allowMissingColumns=True).write.mode(
        "overwrite"
    ).parquet(str(quarantine))
    valid.write.mode("overwrite").partitionBy("event_date").parquet(str(valid_output))
    print(f"valid={valid.count()} invalid={invalid.count()} duplicates={duplicates.count()}")
    session.stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
