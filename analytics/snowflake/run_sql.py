#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from analytics.snowflake.connection import connect

ROOT = Path(__file__).resolve().parent
LAYERS = {
    "ddl": ROOT / "ddl",
    "raw": ROOT / "raw",
    "staging": ROOT / "staging",
    "curated": ROOT / "curated",
    "marts": ROOT / "marts",
    "tests": ROOT / "tests",
}


def split_statements(text: str) -> list[str]:
    statements: list[str] = []
    current: list[str] = []
    for line in text.splitlines():
        if line.strip().startswith("--"):
            continue
        current.append(line)
        if line.rstrip().endswith(";"):
            statement = "\n".join(current).strip().rstrip(";")
            if statement:
                statements.append(statement)
            current = []
    trailing = "\n".join(current).strip()
    if trailing:
        statements.append(trailing)
    return statements


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("layer", choices=LAYERS)
    args = parser.parse_args()
    files = sorted(LAYERS[args.layer].glob("*.sql"))
    if not files:
        raise RuntimeError(f"No SQL files for layer {args.layer}")
    with connect() as connection:
        cursor = connection.cursor()
        try:
            for path in files:
                for statement in split_statements(path.read_text(encoding="utf-8")):
                    cursor.execute(statement)
                print(f"executed {path.relative_to(ROOT)}")
        finally:
            cursor.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
