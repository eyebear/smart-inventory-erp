# Analytics Architecture

## Boundary

The operational ERP remains the system of record. The analytics extension reads from MySQL and writes analytical outputs without changing the existing frontend, backend, PHP integration, or Kubernetes manifests.

## Target flow

```text
MySQL ERP + synthetic retail-media events
        |
        v
Airflow daily DAG
        |
        +--> Python/MySQL extraction
        +--> PySpark cleaning, quarantine, and aggregations
        +--> Parquet datasets partitioned by business date
        |
        v
Snowflake RAW -> STAGING -> CURATED -> MARTS
        |
        v
ThoughtSpot TML models and Liveboards
        |
        v
Technical and business alerts
```

## Reliability principles

- Idempotent reruns by business date
- Explicit schemas and business keys
- Invalid-row quarantine
- Row-count and aggregate reconciliation
- Task retries and timeouts
- Data-freshness validation
- Persistent pipeline run and alert history
