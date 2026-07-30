#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json

from analytics.monitoring.alerting import Alert, emit_alert, resolve_alert
from analytics.pyspark.jobs.common import load_config
from analytics.snowflake.connection import connect


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--business-date", required=True)
    parser.add_argument("--run-id", required=True)
    args = parser.parse_args()
    thresholds = load_config()["quality"]

    queries = {
        "CAMPAIGN_OVER_PACING": (
            "HIGH",
            "SELECT CAMPAIGN_ID,ACTUAL_SPEND FROM MARTS.MART_CAMPAIGN_PACING WHERE ACTUAL_SPEND>0",
        ),
        "LOW_ROAS": (
            "WARNING",
            f"SELECT CAMPAIGN_ID,ROAS FROM MARTS.MART_CAMPAIGN_PERFORMANCE WHERE EVENT_DATE='{args.business_date}' AND ROAS<{float(thresholds['low_roas'])}",
        ),
        "HIGH_CPA": (
            "WARNING",
            f"SELECT CAMPAIGN_ID,CPA FROM MARTS.MART_CAMPAIGN_PERFORMANCE WHERE EVENT_DATE='{args.business_date}' AND CPA>{float(thresholds['high_cpa'])}",
        ),
        "PROMOTED_SKU_LOW_STOCK": (
            "HIGH",
            f"SELECT CAMPAIGN_ID,PRODUCT_ID,QUANTITY_ON_HAND FROM MARTS.MART_PROMOTED_PRODUCT_RISK WHERE EVENT_DATE='{args.business_date}' AND LOW_STOCK_FLAG",
        ),
        "PROMOTED_SKU_EXPIRY_RISK": (
            "WARNING",
            f"SELECT CAMPAIGN_ID,PRODUCT_ID,EXPIRING_UNITS_7D FROM MARTS.MART_PROMOTED_PRODUCT_RISK WHERE EVENT_DATE='{args.business_date}' AND EXPIRY_RISK_FLAG",
        ),
    }

    active_keys: set[str] = set()
    with connect() as connection:
        cursor = connection.cursor()
        try:
            for alert_type, (severity, sql) in queries.items():
                cursor.execute(sql)
                columns = [column[0].lower() for column in cursor.description]
                for row in cursor.fetchall():
                    details = dict(zip(columns, row))
                    entity = str(details.get("campaign_id") or details.get("product_id") or "global")
                    key = f"{alert_type}:{args.business_date}:{entity}"
                    active_keys.add(key)
                    emit_alert(
                        Alert(
                            alert_key=key,
                            alert_class="BUSINESS",
                            alert_type=alert_type,
                            severity=severity,
                            message=f"{alert_type} detected for {entity} on {args.business_date}",
                            source_run_id=args.run_id,
                            details={k: str(v) for k, v in details.items()}
                        )
                    )
        finally:
            cursor.close()

    # Known daily keys that did not reappear are resolved.
    prefixes = [f"{name}:{args.business_date}:" for name in queries]
    from analytics.monitoring.alerting import mysql_connection
    mysql = mysql_connection()
    cursor = mysql.cursor()
    try:
        cursor.execute(
            "SELECT alert_key FROM analytics_alerts WHERE status='OPEN' AND alert_class='BUSINESS'"
        )
        for (key,) in cursor.fetchall():
            if any(key.startswith(prefix) for prefix in prefixes) and key not in active_keys:
                resolve_alert(key)
    finally:
        cursor.close()
        mysql.close()
    print(json.dumps({"active_business_alerts": sorted(active_keys)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
