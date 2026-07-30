#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent / "tml"
ALLOWED_ROOTS = {"table", "model", "liveboard", "answer", "view", "sql_view"}


def validate(path: Path, allow_placeholders: bool) -> list[str]:
    errors: list[str] = []
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception as error:
        return [f"{path.name}: invalid YAML: {error}"]
    if not isinstance(data, dict):
        return [f"{path.name}: root must be a mapping"]
    object_roots = ALLOWED_ROOTS.intersection(data)
    if len(object_roots) != 1:
        errors.append(f"{path.name}: expected exactly one TML object root, found {sorted(object_roots)}")
    if not data.get("guid"):
        errors.append(f"{path.name}: missing guid")
    text = path.read_text(encoding="utf-8")
    if not allow_placeholders and "REPLACE_WITH_" in text:
        errors.append(f"{path.name}: unresolved REPLACE_WITH_ placeholder")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--allow-placeholders", action="store_true")
    args = parser.parse_args()
    errors = [error for path in sorted(ROOT.glob("*.tml")) for error in validate(path, args.allow_placeholders)]
    if errors:
        print("\n".join(errors))
        return 1
    print(f"validated {len(list(ROOT.glob('*.tml')))} TML files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
