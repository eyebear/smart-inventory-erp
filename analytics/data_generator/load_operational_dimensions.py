#!/usr/bin/env python3
"""Upsert generated dimensions and optional event files into operational MySQL."""

from __future__ import annotations

import argparse
import csv
import os
from datetime import date, timedelta
from pathlib import Path

import mysql.connector


def args_parser() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", type=Path, default=Path("analytics/data/generated"))
    parser.add_argument("--load-events", action="store_true")
    parser.add_argument("--event-limit", type=int, default=100_000)
    return parser.parse_args()


def rows(path: Path):
    with path.open(newline="", encoding="utf-8") as handle:
        yield from csv.DictReader(handle)


def main() -> int:
    args = args_parser()
    connection = mysql.connector.connect(
        host=os.environ.get("MYSQL_HOST", "127.0.0.1"),
        port=int(os.environ.get("MYSQL_PORT", "3307")),
        user=os.environ.get("MYSQL_USER", "root"),
        password=os.environ.get("MYSQL_PASSWORD", "abc123456"),
        database=os.environ.get("MYSQL_DATABASE", "smart_inventory_erp")
    )
    cursor = connection.cursor()
    try:
        supplier_ids: dict[str, int] = {}
        for row in rows(args.input_dir / "suppliers.csv"):
            cursor.execute(
                "INSERT INTO suppliers (name, country, contact_email) VALUES (%s,%s,%s) "
                "ON DUPLICATE KEY UPDATE country=VALUES(country), contact_email=VALUES(contact_email)",
                (row["name"], row["country"], row["contact_email"])
            )
            cursor.execute("SELECT id FROM suppliers WHERE name=%s", (row["name"],))
            supplier_ids[row["supplier_external_id"]] = cursor.fetchone()[0]

        store_ids: dict[str, int] = {}
        for row in rows(args.input_dir / "stores.csv"):
            cursor.execute("SELECT id FROM stores WHERE name=%s AND city=%s", (row["name"], row["city"]))
            existing = cursor.fetchone()
            if existing:
                store_ids[row["store_external_id"]] = existing[0]
            else:
                cursor.execute(
                    "INSERT INTO stores (name, city, address) VALUES (%s,%s,%s)",
                    (row["name"], row["city"], row["address"])
                )
                store_ids[row["store_external_id"]] = cursor.lastrowid

        product_ids: dict[str, int] = {}
        for row in rows(args.input_dir / "products.csv"):
            cursor.execute(
                "INSERT INTO products (sku,name_en,name_zh,category,origin_country,supplier_id,unit_cost) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE "
                "name_en=VALUES(name_en), category=VALUES(category), supplier_id=VALUES(supplier_id), unit_cost=VALUES(unit_cost)",
                (
                    row["sku"], row["name_en"], row["name_zh"] or None, row["category"],
                    row["origin_country"], supplier_ids[row["supplier_external_id"]], row["unit_cost"]
                )
            )
            cursor.execute("SELECT id FROM products WHERE sku=%s", (row["sku"],))
            product_id = cursor.fetchone()[0]
            product_ids[row["product_external_id"]] = product_id
            store_id = store_ids[list(store_ids)[product_id % len(store_ids)]]
            batch_code = f"SYNTH-{row['sku']}"
            cursor.execute("SELECT id FROM inventory_batches WHERE batch_code=%s", (batch_code,))
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO inventory_batches (product_id,store_id,batch_code,quantity,expiry_date,received_date) "
                    "VALUES (%s,%s,%s,%s,%s,%s)",
                    (
                        product_id, store_id, batch_code, int(row["initial_quantity"]),
                        date.today() + timedelta(days=int(row["expiry_days"])), date.today()
                    )
                )

        advertiser_ids: dict[str, int] = {}
        for row in rows(args.input_dir / "advertisers.csv"):
            cursor.execute(
                "INSERT INTO advertisers (name,industry,contact_email) VALUES (%s,%s,%s) "
                "ON DUPLICATE KEY UPDATE industry=VALUES(industry), contact_email=VALUES(contact_email)",
                (row["name"], row["industry"], row["contact_email"])
            )
            cursor.execute("SELECT id FROM advertisers WHERE name=%s", (row["name"],))
            advertiser_ids[row["advertiser_external_id"]] = cursor.fetchone()[0]

        audience_ids: dict[str, int] = {}
        for row in rows(args.input_dir / "audience_segments.csv"):
            cursor.execute(
                "INSERT INTO audience_segments (name,description) VALUES (%s,%s) "
                "ON DUPLICATE KEY UPDATE description=VALUES(description)",
                (row["name"], row["description"])
            )
            cursor.execute("SELECT id FROM audience_segments WHERE name=%s", (row["name"],))
            audience_ids[row["audience_external_id"]] = cursor.fetchone()[0]

        campaign_ids: dict[str, int] = {}
        for row in rows(args.input_dir / "campaigns.csv"):
            cursor.execute(
                "INSERT INTO campaigns (campaign_code,advertiser_id,store_id,region,channel,audience_segment_id,start_date,end_date,planned_budget,daily_budget,objective,status) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON DUPLICATE KEY UPDATE "
                "planned_budget=VALUES(planned_budget), daily_budget=VALUES(daily_budget), status=VALUES(status)",
                (
                    row["campaign_code"], advertiser_ids[row["advertiser_external_id"]],
                    store_ids[row["store_external_id"]], row["region"], row["channel"],
                    audience_ids[row["audience_external_id"]], row["start_date"], row["end_date"],
                    row["planned_budget"], row["daily_budget"], row["objective"], row["status"]
                )
            )
            cursor.execute("SELECT id FROM campaigns WHERE campaign_code=%s", (row["campaign_code"],))
            campaign_ids[row["campaign_external_id"]] = cursor.fetchone()[0]

        for row in rows(args.input_dir / "campaign_products.csv"):
            cursor.execute(
                "INSERT IGNORE INTO campaign_products (campaign_id,product_id,promoted_sku) VALUES (%s,%s,%s)",
                (campaign_ids[row["campaign_external_id"]], product_ids[row["product_external_id"]], row["promoted_sku"])
            )

        for row in rows(args.input_dir / "campaign_budgets.csv"):
            cursor.execute(
                "INSERT INTO campaign_budgets (campaign_id,budget_date,planned_daily_budget) VALUES (%s,%s,%s) "
                "ON DUPLICATE KEY UPDATE planned_daily_budget=VALUES(planned_daily_budget)",
                (campaign_ids[row["campaign_external_id"]], row["budget_date"], row["planned_daily_budget"])
            )

        if args.load_events:
            loaded = 0
            for event_file in sorted((args.input_dir / "campaign_daily_events").glob("part-*.csv")):
                for row in rows(event_file):
                    if loaded >= args.event_limit:
                        break
                    campaign_id = campaign_ids.get(row["campaign_external_id"])
                    if not row["event_date"] or row["event_date"] == "2026-02-30":
                        continue
                    cursor.execute(
                        "INSERT IGNORE INTO campaign_daily_events "
                        "(event_id,event_date,campaign_id,product_id,store_id,audience_segment_id,region,channel,device,impressions,clicks,conversions,spend,attributed_revenue,ingested_at) "
                        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                        (
                            row["event_id"], row["event_date"], campaign_id,
                            product_ids.get(row["product_external_id"]), store_ids.get(row["store_external_id"]),
                            audience_ids.get(row["audience_external_id"]), row["region"], row["channel"], row["device"],
                            row["impressions"], row["clicks"], row["conversions"], row["spend"],
                            row["attributed_revenue"], row["ingested_at"]
                        )
                    )
                    loaded += 1
                if loaded >= args.event_limit:
                    break
            print(f"loaded {loaded} campaign event rows")

        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
