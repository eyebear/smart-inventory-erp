#!/usr/bin/env python3
from __future__ import annotations

from pyspark.sql import functions as F

from analytics.pyspark.jobs.common import path_for, spark


def main() -> int:
    session = spark("smart-inventory-build-campaign-daily")
    events = session.read.parquet(str(path_for("curated") / "clean_campaign_events"))
    daily = (
        events.groupBy(
            "event_date", "campaign_external_id", "product_external_id",
            "store_external_id", "audience_external_id", "region", "channel", "device"
        )
        .agg(
            F.sum("impressions").alias("impressions"),
            F.sum("clicks").alias("clicks"),
            F.sum("conversions").alias("conversions"),
            F.sum("spend").alias("spend"),
            F.sum("attributed_revenue").alias("attributed_revenue"),
            F.max("ingested_at").alias("latest_ingested_at")
        )
        .withColumn("ctr", F.col("clicks") / F.when(F.col("impressions") == 0, None).otherwise(F.col("impressions")))
        .withColumn("cpm", F.col("spend") * 1000 / F.when(F.col("impressions") == 0, None).otherwise(F.col("impressions")))
        .withColumn("cpc", F.col("spend") / F.when(F.col("clicks") == 0, None).otherwise(F.col("clicks")))
        .withColumn("cpa", F.col("spend") / F.when(F.col("conversions") == 0, None).otherwise(F.col("conversions")))
        .withColumn("roas", F.col("attributed_revenue") / F.when(F.col("spend") == 0, None).otherwise(F.col("spend")))
    )
    daily.write.mode("overwrite").partitionBy("event_date").parquet(
        str(path_for("curated") / "campaign_daily_performance")
    )
    session.stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
