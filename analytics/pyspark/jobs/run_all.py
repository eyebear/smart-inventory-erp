#!/usr/bin/env python3
from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import date

MODULES = [
    "analytics.pyspark.jobs.extract_mysql_snapshot",
    "analytics.pyspark.jobs.clean_campaign_events",
    "analytics.pyspark.jobs.build_inventory_snapshot",
    "analytics.pyspark.jobs.build_waste_daily_summary",
    "analytics.pyspark.jobs.build_campaign_daily",
    "analytics.pyspark.jobs.build_promoted_product_risk",
    "analytics.pyspark.jobs.run_data_quality_checks",
]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--business-date", type=date.fromisoformat, default=date.today())
    args = parser.parse_args()
    for module in MODULES:
        subprocess.run(
            [sys.executable, "-m", module, "--business-date", args.business_date.isoformat()],
            check=True
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
