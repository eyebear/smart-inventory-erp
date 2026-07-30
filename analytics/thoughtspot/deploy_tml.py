#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent / "tml"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--create-new", action="store_true")
    args = parser.parse_args()
    host = os.environ.get("THOUGHTSPOT_HOST", "").rstrip("/")
    token = os.environ.get("THOUGHTSPOT_BEARER_TOKEN")
    if not host or not token:
        raise RuntimeError("THOUGHTSPOT_HOST and THOUGHTSPOT_BEARER_TOKEN are required")

    tmls = [path.read_text(encoding="utf-8") for path in sorted(ROOT.glob("*.tml"))]
    payload = {
        "metadata_tmls": tmls,
        "import_policy": "VALIDATE_ONLY" if args.validate_only else "ALL_OR_NONE",
        "create_new": args.create_new,
    }
    response = requests.post(
        f"{host}/api/rest/2.0/metadata/tml/import",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload,
        timeout=60,
    )
    response.raise_for_status()
    print(response.text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
