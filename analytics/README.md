# Analytics Extension

This directory adds a separate analytics and retail-media layer to the existing Smart Inventory ERP application. It does not replace the Next.js frontend, Express backend, MySQL operational database, legacy PHP service, or Kubernetes deployment.

The extension uses:

- Apache Airflow for orchestration
- Python and PySpark for extraction, validation, transformation, and Parquet output
- Snowflake for raw, staging, curated, and mart layers
- ThoughtSpot Modeling Language (TML) for governed semantic models
- MySQL for operational retail and retail-media source data

## Local analytics environment

1. Copy `.env.analytics.example` to `.env.analytics` and update credentials.
2. Start the original ERP stack with `docker compose up -d --build`.
3. Start the analytics environment with `docker compose -f docker-compose.analytics.yml --env-file .env.analytics up --build`.
4. Open Airflow at `http://localhost:8080`.

The local Airflow deployment is intentionally development-oriented. Production deployments should use a supported external metadata database, remote logging, secrets management, and a production executor.
