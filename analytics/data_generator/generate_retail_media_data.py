#!/usr/bin/env python3
"""Generate deterministic, high-volume retail-media data for analytics testing.

The generator streams CSV files to disk and intentionally injects controlled
quality failures. It does not require the operational ERP to be running.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import random
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable

CHANNELS = ["DISPLAY", "VIDEO", "NATIVE", "CONNECTED_TV", "MOBILE"]
DEVICES = ["MOBILE", "DESKTOP", "TABLET", "CONNECTED_TV"]
REGIONS = ["Metro Vancouver", "Fraser Valley", "Vancouver Island", "Okanagan"]
OBJECTIVES = ["AWARENESS", "TRAFFIC", "CONVERSION", "ROAS"]
CATEGORIES = ["Fresh Food", "Seafood", "Snack", "Beverage", "Frozen", "Household"]


@dataclass(frozen=True)
class QualityRates:
    duplicate: float = 0.002
    missing_campaign: float = 0.001
    clicks_gt_impressions: float = 0.001
    conversions_gt_clicks: float = 0.001
    negative_spend: float = 0.0005
    invalid_date: float = 0.0005
    late_arrival: float = 0.01


def write_csv(path: Path, fieldnames: list[str], rows: Iterable[dict]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
            count += 1
    return count


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=Path("analytics/data/generated"))
    parser.add_argument("--seed", type=int, default=20260730)
    parser.add_argument("--campaigns", type=int, default=75)
    parser.add_argument("--products", type=int, default=200)
    parser.add_argument("--stores", type=int, default=8)
    parser.add_argument("--audiences", type=int, default=12)
    parser.add_argument("--rows", type=int, default=3_000_000)
    parser.add_argument("--chunk-size", type=int, default=250_000)
    parser.add_argument("--start-date", type=date.fromisoformat, default=date(2025, 8, 1))
    parser.add_argument("--days", type=int, default=365)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not 50 <= args.campaigns <= 100:
        raise ValueError("--campaigns must be between 50 and 100")
    if not 100 <= args.products <= 300:
        raise ValueError("--products must be between 100 and 300")
    if args.rows < 1:
        raise ValueError("--rows must be positive")

    rng = random.Random(args.seed)
    out = args.output_dir
    out.mkdir(parents=True, exist_ok=True)
    rates = QualityRates()

    stores = [
        {
            "store_external_id": f"STORE-{i:03d}",
            "name": f"Synthetic Store {i:02d}",
            "city": REGIONS[(i - 1) % len(REGIONS)],
            "address": f"{100 + i} Analytics Avenue"
        }
        for i in range(1, args.stores + 1)
    ]
    suppliers = [
        {
            "supplier_external_id": f"SUP-{i:03d}",
            "name": f"Synthetic Supplier {i:02d}",
            "country": "Canada",
            "contact_email": f"supplier{i:02d}@example.test"
        }
        for i in range(1, max(11, math.ceil(args.products / 15)) + 1)
    ]
    products = [
        {
            "product_external_id": f"PROD-{i:04d}",
            "sku": f"SYN-{i:04d}",
            "name_en": f"Synthetic Product {i:04d}",
            "name_zh": "",
            "category": CATEGORIES[(i - 1) % len(CATEGORIES)],
            "origin_country": "Canada",
            "supplier_external_id": suppliers[(i - 1) % len(suppliers)]["supplier_external_id"],
            "unit_cost": f"{rng.uniform(1.5, 40):.2f}",
            "initial_quantity": 5 if i % 19 == 0 else rng.randint(40, 600),
            "expiry_days": rng.randint(5, 180)
        }
        for i in range(1, args.products + 1)
    ]
    advertisers = [
        {
            "advertiser_external_id": f"ADV-{i:03d}",
            "name": f"Retail Media Advertiser {i:02d}",
            "industry": "Consumer Packaged Goods",
            "contact_email": f"advertiser{i:02d}@example.test"
        }
        for i in range(1, 16)
    ]
    audiences = [
        {
            "audience_external_id": f"AUD-{i:03d}",
            "name": f"Audience Segment {i:02d}",
            "description": f"Synthetic audience cohort {i:02d}"
        }
        for i in range(1, args.audiences + 1)
    ]

    campaigns: list[dict] = []
    campaign_products: list[dict] = []
    campaign_budgets: list[dict] = []
    for i in range(1, args.campaigns + 1):
        campaign_start = args.start_date + timedelta(days=rng.randint(0, max(0, args.days - 90)))
        duration = rng.randint(30, 90)
        campaign_end = campaign_start + timedelta(days=duration)
        planned_budget = rng.uniform(10_000, 250_000)
        campaign_id = f"CMP-{i:04d}"
        product = products[(i * 7) % len(products)]
        store = stores[(i * 3) % len(stores)]
        audience = audiences[(i * 5) % len(audiences)]
        campaigns.append(
            {
                "campaign_external_id": campaign_id,
                "campaign_code": f"RETAIL-{campaign_id}",
                "advertiser_external_id": advertisers[(i - 1) % len(advertisers)]["advertiser_external_id"],
                "store_external_id": store["store_external_id"],
                "region": store["city"],
                "channel": CHANNELS[(i - 1) % len(CHANNELS)],
                "audience_external_id": audience["audience_external_id"],
                "start_date": campaign_start.isoformat(),
                "end_date": campaign_end.isoformat(),
                "planned_budget": f"{planned_budget:.2f}",
                "daily_budget": f"{planned_budget / duration:.2f}",
                "objective": OBJECTIVES[(i - 1) % len(OBJECTIVES)],
                "status": "ACTIVE"
            }
        )
        campaign_products.append(
            {
                "campaign_external_id": campaign_id,
                "product_external_id": product["product_external_id"],
                "promoted_sku": product["sku"]
            }
        )
        for day_offset in range(duration + 1):
            campaign_budgets.append(
                {
                    "campaign_external_id": campaign_id,
                    "budget_date": (campaign_start + timedelta(days=day_offset)).isoformat(),
                    "planned_daily_budget": f"{planned_budget / duration:.2f}"
                }
            )

    counts: dict[str, int] = {}
    counts["stores"] = write_csv(out / "stores.csv", list(stores[0]), stores)
    counts["suppliers"] = write_csv(out / "suppliers.csv", list(suppliers[0]), suppliers)
    counts["products"] = write_csv(out / "products.csv", list(products[0]), products)
    counts["advertisers"] = write_csv(out / "advertisers.csv", list(advertisers[0]), advertisers)
    counts["audience_segments"] = write_csv(out / "audience_segments.csv", list(audiences[0]), audiences)
    counts["campaigns"] = write_csv(out / "campaigns.csv", list(campaigns[0]), campaigns)
    counts["campaign_products"] = write_csv(
        out / "campaign_products.csv", list(campaign_products[0]), campaign_products
    )
    counts["campaign_budgets"] = write_csv(
        out / "campaign_budgets.csv", list(campaign_budgets[0]), campaign_budgets
    )

    event_dir = out / "campaign_daily_events"
    event_dir.mkdir(exist_ok=True)
    event_fields = [
        "event_id", "event_date", "campaign_external_id", "product_external_id",
        "store_external_id", "audience_external_id", "region", "channel", "device",
        "impressions", "clicks", "conversions", "spend", "attributed_revenue", "ingested_at"
    ]
    anomaly_counts = {key: 0 for key in asdict(rates)}
    duplicate_source: dict | None = None
    total_written = 0
    part = 0
    handle = None
    writer = None
    try:
        for row_number in range(args.rows):
            if row_number % args.chunk_size == 0:
                if handle:
                    handle.close()
                handle = (event_dir / f"part-{part:05d}.csv").open("w", newline="", encoding="utf-8")
                writer = csv.DictWriter(handle, fieldnames=event_fields)
                writer.writeheader()
                part += 1

            campaign = campaigns[rng.randrange(len(campaigns))]
            event_date = args.start_date + timedelta(days=rng.randrange(args.days))
            product = campaign_products[int(campaign["campaign_external_id"].split("-")[-1]) - 1]
            impressions = rng.randint(100, 25_000)
            clicks = int(impressions * rng.uniform(0.002, 0.08))
            conversions = int(clicks * rng.uniform(0.01, 0.25))
            spend = max(0.01, clicks * rng.uniform(0.25, 4.5))
            revenue = conversions * rng.uniform(5, 120)
            ingested_at = datetime.combine(event_date, datetime.min.time(), tzinfo=timezone.utc) + timedelta(
                hours=rng.randint(1, 48)
            )
            row = {
                "event_id": f"EVT-{args.seed}-{row_number:010d}",
                "event_date": event_date.isoformat(),
                "campaign_external_id": campaign["campaign_external_id"],
                "product_external_id": product["product_external_id"],
                "store_external_id": campaign["store_external_id"],
                "audience_external_id": campaign["audience_external_id"],
                "region": campaign["region"],
                "channel": campaign["channel"],
                "device": DEVICES[rng.randrange(len(DEVICES))],
                "impressions": impressions,
                "clicks": clicks,
                "conversions": conversions,
                "spend": f"{spend:.4f}",
                "attributed_revenue": f"{revenue:.4f}",
                "ingested_at": ingested_at.isoformat()
            }

            sample = rng.random()
            if sample < rates.missing_campaign:
                row["campaign_external_id"] = ""
                anomaly_counts["missing_campaign"] += 1
            elif sample < rates.missing_campaign + rates.clicks_gt_impressions:
                row["clicks"] = impressions + rng.randint(1, 100)
                anomaly_counts["clicks_gt_impressions"] += 1
            elif sample < rates.missing_campaign + rates.clicks_gt_impressions + rates.conversions_gt_clicks:
                row["conversions"] = int(row["clicks"]) + rng.randint(1, 20)
                anomaly_counts["conversions_gt_clicks"] += 1
            elif sample < rates.missing_campaign + rates.clicks_gt_impressions + rates.conversions_gt_clicks + rates.negative_spend:
                row["spend"] = f"{-rng.uniform(1, 50):.4f}"
                anomaly_counts["negative_spend"] += 1
            elif sample < rates.missing_campaign + rates.clicks_gt_impressions + rates.conversions_gt_clicks + rates.negative_spend + rates.invalid_date:
                row["event_date"] = "2026-02-30"
                anomaly_counts["invalid_date"] += 1

            if rng.random() < rates.late_arrival:
                row["ingested_at"] = (
                    datetime.now(timezone.utc) + timedelta(days=rng.randint(3, 30))
                ).isoformat()
                anomaly_counts["late_arrival"] += 1

            if writer is None:
                raise RuntimeError("event writer not initialized")
            writer.writerow(row)
            total_written += 1

            if duplicate_source is not None and rng.random() < rates.duplicate:
                writer.writerow(duplicate_source)
                total_written += 1
                anomaly_counts["duplicate"] += 1
            duplicate_source = row.copy()
    finally:
        if handle:
            handle.close()

    counts["campaign_daily_events"] = total_written
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "seed": args.seed,
        "parameters": vars(args) | {"output_dir": str(args.output_dir), "start_date": args.start_date.isoformat()},
        "counts": counts,
        "quality_rates": asdict(rates),
        "injected_anomalies": anomaly_counts,
        "low_inventory_products": [p["product_external_id"] for p in products if int(p["initial_quantity"]) <= 5]
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
