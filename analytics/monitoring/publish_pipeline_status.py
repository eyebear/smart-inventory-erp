#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from datetime import datetime, timezone

from analytics.monitoring.alerting import mysql_connection


def publish_mysql(args, now: datetime) -> None:
    connection = mysql_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO analytics_pipeline_runs
              (run_id,dag_id,business_date,environment,status,rows_processed,error_message,started_at,finished_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON DUPLICATE KEY UPDATE status=VALUES(status),rows_processed=VALUES(rows_processed),
              error_message=VALUES(error_message),finished_at=VALUES(finished_at)
            """,
            (
                args.run_id, args.dag_id, args.business_date,
                os.environ.get("SMART_INVENTORY_ENV", "development"), args.status,
                args.rows_processed, args.error_message, now, now
            )
        )
        connection.commit()
    finally:
        cursor.close()
        connection.close()


def publish_snowflake(args, now: datetime) -> None:
    if not os.environ.get("SNOWFLAKE_ACCOUNT"):
        print("SNOWFLAKE_ACCOUNT not set; skipping Snowflake pipeline status")
        return
    from analytics.snowflake.connection import connect
    with connect() as connection:
        cursor = connection.cursor()
        try:
            cursor.execute(
                """
                MERGE INTO CURATED.FACT_PIPELINE_RUN t
                USING (SELECT %s RUN_ID,%s DAG_ID,%s::DATE BUSINESS_DATE,%s::TIMESTAMP_TZ FINISHED_AT,
                              %s STATUS,%s ROWS_PROCESSED,%s ERROR_MESSAGE) s
                ON t.RUN_ID=s.RUN_ID
                WHEN MATCHED THEN UPDATE SET FINISHED_AT=s.FINISHED_AT,STATUS=s.STATUS,
                  ROWS_PROCESSED=s.ROWS_PROCESSED,ERROR_MESSAGE=s.ERROR_MESSAGE
                WHEN NOT MATCHED THEN INSERT(RUN_ID,DAG_ID,BUSINESS_DATE,STARTED_AT,FINISHED_AT,STATUS,ROWS_PROCESSED,ERROR_MESSAGE)
                  VALUES(s.RUN_ID,s.DAG_ID,s.BUSINESS_DATE,s.FINISHED_AT,s.FINISHED_AT,s.STATUS,s.ROWS_PROCESSED,s.ERROR_MESSAGE)
                """,
                (
                    args.run_id, args.dag_id, args.business_date, now.isoformat(),
                    args.status, args.rows_processed, args.error_message
                )
            )
        finally:
            cursor.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--dag-id", required=True)
    parser.add_argument("--business-date", required=True)
    parser.add_argument("--status", required=True)
    parser.add_argument("--rows-processed", type=int, default=0)
    parser.add_argument("--error-message")
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    publish_mysql(args, now)
    publish_snowflake(args, now)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
