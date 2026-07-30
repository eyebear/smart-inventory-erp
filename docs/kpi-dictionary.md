# KPI Dictionary

| KPI | Definition |
|---|---|
| CTR | clicks / impressions |
| CPM | spend / impressions * 1000 |
| CPC | spend / clicks |
| CPA | spend / conversions |
| ROAS | attributed revenue / spend |
| Budget utilization | cumulative spend / planned budget |
| Pacing variance | actual budget utilization - expected elapsed-time utilization |
| Inventory turnover | quantity moved out / average available inventory for the period |
| Waste rate | quantity wasted / quantity received or available for the same grain |
| Expiring inventory value | units expiring inside the configured risk window * unit cost |
| Stock availability | products with stock above zero / active products |

All ratios must use `NULLIF` or equivalent zero-denominator protection. Metric grain and inclusion rules must be encoded in Snowflake mart SQL and TML definitions.
