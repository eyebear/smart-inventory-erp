from pathlib import Path

from analytics.thoughtspot.validate_tml import validate


def test_all_tml_templates_are_valid_yaml():
    root = Path(__file__).resolve().parent / "tml"
    errors = [error for path in root.glob("*.tml") for error in validate(path, allow_placeholders=True)]
    assert errors == []
