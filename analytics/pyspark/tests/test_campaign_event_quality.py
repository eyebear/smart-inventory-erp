from decimal import Decimal

from analytics.pyspark.jobs.clean_campaign_events import classify_invalid
from analytics.pyspark.jobs.schemas import CAMPAIGN_EVENT_CSV_SCHEMA


def test_invalid_metric_relationship_is_quarantined(spark_session):
    row = (
        "evt-1", "2026-07-30", "CMP-1", "PROD-1", "STORE-1", "AUD-1",
        "Metro Vancouver", "DISPLAY", "MOBILE", 100, 110, 2,
        Decimal("10.0000"), Decimal("20.0000"), None
    )
    result = classify_invalid(spark_session.createDataFrame([row], CAMPAIGN_EVENT_CSV_SCHEMA)).collect()[0]
    assert result.quality_error == "CLICKS_EXCEED_IMPRESSIONS"


def test_valid_event_has_no_quality_error(spark_session):
    row = (
        "evt-2", "2026-07-30", "CMP-1", "PROD-1", "STORE-1", "AUD-1",
        "Metro Vancouver", "DISPLAY", "MOBILE", 100, 10, 2,
        Decimal("10.0000"), Decimal("20.0000"), None
    )
    result = classify_invalid(spark_session.createDataFrame([row], CAMPAIGN_EVENT_CSV_SCHEMA)).collect()[0]
    assert result.quality_error is None
