# ThoughtSpot TML

The TML files in `tml/` are version-controlled deployment templates for the Snowflake marts. Replace placeholder GUIDs and connection names after creating the Snowflake connection in the target ThoughtSpot environment.

Recommended workflow:

1. Create or identify the Snowflake connection in ThoughtSpot.
2. Export one table/model from the target environment to confirm the exact TML version and connection mapping.
3. Replace `REPLACE_WITH_*` placeholders in this repository.
4. Run `python analytics/thoughtspot/validate_tml.py`.
5. Run remote validation/import with `python analytics/thoughtspot/deploy_tml.py --validate-only` before importing.

TML objects should reference stable Snowflake MARTS tables, not RAW or STAGING tables.
