#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any

import mysql.connector
import requests


@dataclass(frozen=True)
class Alert:
    alert_key: str
    alert_class: str
    alert_type: str
    severity: str
    message: str
    source_run_id: str | None = None
    details: dict[str, Any] | None = None


def mysql_connection():
    return mysql.connector.connect(
        host=os.environ.get("MYSQL_HOST", "127.0.0.1"),
        port=int(os.environ.get("MYSQL_PORT", "3307")),
        user=os.environ.get("MYSQL_USER", "root"),
        password=os.environ.get("MYSQL_PASSWORD", "abc123456"),
        database=os.environ.get("MYSQL_DATABASE", "smart_inventory_erp")
    )


def emit_alert(alert: Alert) -> None:
    connection = mysql_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO analytics_alerts
              (alert_key,alert_class,alert_type,severity,status,message,source_run_id,details,opened_at,last_seen_at)
            VALUES (%s,%s,%s,%s,'OPEN',%s,%s,%s,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
              alert_class=VALUES(alert_class),alert_type=VALUES(alert_type),severity=VALUES(severity),
              status='OPEN',message=VALUES(message),source_run_id=VALUES(source_run_id),
              details=VALUES(details),last_seen_at=CURRENT_TIMESTAMP,resolved_at=NULL
            """,
            (
                alert.alert_key, alert.alert_class, alert.alert_type, alert.severity,
                alert.message, alert.source_run_id, json.dumps(alert.details or {})
            )
        )
        connection.commit()
    finally:
        cursor.close()
        connection.close()

    webhook = os.environ.get("ALERT_WEBHOOK_URL")
    if webhook:
        response = requests.post(webhook, json=asdict(alert), timeout=10)
        response.raise_for_status()


def resolve_alert(alert_key: str) -> None:
    connection = mysql_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(
            "UPDATE analytics_alerts SET status='RESOLVED',resolved_at=CURRENT_TIMESTAMP WHERE alert_key=%s AND status='OPEN'",
            (alert_key,)
        )
        connection.commit()
    finally:
        cursor.close()
        connection.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--alert-key", required=True)
    parser.add_argument("--alert-class", choices=["TECHNICAL", "BUSINESS"], required=True)
    parser.add_argument("--alert-type", required=True)
    parser.add_argument("--severity", choices=["INFO", "WARNING", "HIGH", "CRITICAL"], required=True)
    parser.add_argument("--message", required=True)
    parser.add_argument("--source-run-id")
    parser.add_argument("--details-json", default="{}")
    args = parser.parse_args()
    emit_alert(
        Alert(
            alert_key=args.alert_key,
            alert_class=args.alert_class,
            alert_type=args.alert_type,
            severity=args.severity,
            message=args.message,
            source_run_id=args.source_run_id,
            details=json.loads(args.details_json) | {"emitted_at": datetime.now(timezone.utc).isoformat()}
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
