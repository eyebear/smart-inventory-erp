#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime, timezone

from analytics.snowflake.connection import connect


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("check", choices=["reconciliation", "freshness"])
    parser.add_argument("--business-date", required=True)
    parser.add_argument("--freshness-hours", type=int, default=36)
    args = parser.parse_args()

    with connect() as connection:
        cursor = connection.cursor()
        try:
            if args.check == "reconciliation":
                checks = {
                    "campaign_clicks_not_above_impressions":
                        "SELECT COUNT(*) FROM MARTS.MART_CAMPAIGN_PERFORMANCE WHERE CLICKS>IMPRESSIONS",
                    "campaign_conversions_not_above_clicks":
                        "SELECT COUNT(*) FROM MARTS.MART_CAMPAIGN_PERFORMANCE WHERE CONVERSIONS>CLICKS",
                    "campaign_spend_nonnegative":
                        "SELECT COUNT(*) FROM MARTS.MART_CAMPAIGN_PERFORMANCE WHERE SPEND<0",
                    "inventory_nonnegative":
                        "SELECT COUNT(*) FROM MARTS.MART_INVENTORY_HEALTH WHERE QUANTITY_ON_HAND<0",
                }
                failed = []
                for name, sql in checks.items():
                    cursor.execute(sql)
                    count = int(cursor.fetchone()[0])
                    print(f"{name}={count}")
                    if count:
                        failed.append(f"{name}:{count}")
                if failed:
                    raise RuntimeError("Reconciliation failures: " + ", ".join(failed))
            else:
                cursor.execute(
                    "SELECT MAX(LATEST_INGESTED_AT) FROM MARTS.MART_CAMPAIGN_PERFORMANCE"
                )
                latest = cursor.fetchone()[0]
                if latest is None:
                    raise RuntimeError("Campaign performance mart has no freshness timestamp")
                if latest.tzinfo is None:
                    latest = latest.replace(tzinfo=timezone.utc)
                age_hours = (datetime.now(timezone.utc) - latest.astimezone(timezone.utc)).total_seconds() / 3600
                print(f"latest_ingested_at={latest.isoformat()} age_hours={age_hours:.2f}")
                if age_hours > args.freshness_hours:
                    raise RuntimeError(
                        f"Campaign data is stale: {age_hours:.2f}h > {args.freshness_hours}h"
                    )
        finally:
            cursor.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
