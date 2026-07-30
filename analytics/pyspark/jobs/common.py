from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from pyspark.sql import SparkSession

PROJECT_ROOT = Path(__file__).resolve().parents[3]


def load_config() -> dict[str, Any]:
    config_path = Path(
        os.environ.get(
            "ANALYTICS_CONFIG",
            PROJECT_ROOT / "analytics/config/development.json"
        )
    )
    with config_path.open(encoding="utf-8") as handle:
        config = json.load(handle)
    return config


def path_for(name: str) -> Path:
    config = load_config()
    value = config["paths"][name]
    path = Path(value)
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    path.mkdir(parents=True, exist_ok=True)
    return path


def spark(app_name: str) -> SparkSession:
    return (
        SparkSession.builder
        .appName(app_name)
        .master(os.environ.get("SPARK_MASTER", "local[*]"))
        .config("spark.sql.session.timeZone", "UTC")
        .config("spark.sql.sources.partitionOverwriteMode", "dynamic")
        .config("spark.sql.adaptive.enabled", "true")
        .getOrCreate()
    )
