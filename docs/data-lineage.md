# Analytics Data Lineage

| Source | Transformation | Curated output | Consumer |
|---|---|---|---|
| MySQL `products`, `stores`, `suppliers` | Snapshot and type enforcement | Dimensions | Inventory and campaign marts |
| MySQL `inventory_batches`, `inventory_movements` | Daily inventory aggregation | `inventory_daily_snapshot` | Inventory health and promoted-product risk |
| MySQL `waste_records` | Daily store/product aggregation | `waste_daily_summary` | Waste performance mart |
| Generated or ingested campaign events | Validation, deduplication, quarantine, daily aggregation | `campaign_daily_performance` | Campaign performance and pacing marts |
| Pipeline metadata | Task and quality outcomes | `pipeline_data_quality_results` | Pipeline health mart and alerts |
