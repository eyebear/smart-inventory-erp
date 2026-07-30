import csv
import json
import subprocess
import sys
from pathlib import Path


def test_generator_creates_dimensions_events_and_manifest(tmp_path: Path):
    script = Path(__file__).with_name("generate_retail_media_data.py")
    subprocess.run(
        [
            sys.executable,
            str(script),
            "--output-dir",
            str(tmp_path),
            "--campaigns",
            "50",
            "--products",
            "100",
            "--stores",
            "4",
            "--audiences",
            "5",
            "--rows",
            "2000",
            "--chunk-size",
            "750"
        ],
        check=True
    )

    manifest = json.loads((tmp_path / "manifest.json").read_text())
    assert manifest["counts"]["campaigns"] == 50
    assert manifest["counts"]["products"] == 100
    assert manifest["counts"]["campaign_daily_events"] >= 2000
    assert len(list((tmp_path / "campaign_daily_events").glob("part-*.csv"))) == 3

    with (tmp_path / "campaigns.csv").open(newline="", encoding="utf-8") as handle:
        first = next(csv.DictReader(handle))
    assert first["campaign_code"].startswith("RETAIL-CMP-")
