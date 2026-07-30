# Analytics Pipeline Runbook

## Normal daily run

1. Verify the ERP MySQL health endpoint and database connectivity.
2. Confirm the expected campaign-event partition exists or generate development data.
3. Run extraction and PySpark transformations.
4. Review quarantine and quality summaries.
5. Load Snowflake RAW tables and execute staged MERGE scripts.
6. Build marts and run reconciliation/freshness checks.
7. Publish pipeline status and evaluate business alerts.
8. Deploy or validate TML only after mart schemas are stable.

## Recovery

- Rerun the failed task first.
- Rerun the complete business date when upstream data changed.
- Do not manually append to curated tables; use idempotent MERGE logic.
- Resolve the alert only after freshness and reconciliation checks pass.

## Secrets

Do not commit MySQL, Snowflake, webhook, or ThoughtSpot credentials. Use `.env.analytics` locally and a secrets manager in production.
