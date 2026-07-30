from pyspark.sql.types import (
    DecimalType,
    LongType,
    StringType,
    StructField,
    StructType,
    TimestampType,
)

CAMPAIGN_EVENT_CSV_SCHEMA = StructType(
    [
        StructField("event_id", StringType(), False),
        StructField("event_date", StringType(), True),
        StructField("campaign_external_id", StringType(), True),
        StructField("product_external_id", StringType(), True),
        StructField("store_external_id", StringType(), True),
        StructField("audience_external_id", StringType(), True),
        StructField("region", StringType(), True),
        StructField("channel", StringType(), True),
        StructField("device", StringType(), True),
        StructField("impressions", LongType(), True),
        StructField("clicks", LongType(), True),
        StructField("conversions", LongType(), True),
        StructField("spend", DecimalType(18, 4), True),
        StructField("attributed_revenue", DecimalType(18, 4), True),
        StructField("ingested_at", TimestampType(), True),
    ]
)
