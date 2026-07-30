from __future__ import annotations

import os
from contextlib import contextmanager

import snowflake.connector


@contextmanager
def connect():
    required = ["SNOWFLAKE_ACCOUNT", "SNOWFLAKE_USER", "SNOWFLAKE_PASSWORD"]
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise RuntimeError(f"Missing Snowflake environment variables: {', '.join(missing)}")
    connection = snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        password=os.environ["SNOWFLAKE_PASSWORD"],
        warehouse=os.environ.get("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"),
        database=os.environ.get("SNOWFLAKE_DATABASE", "SMART_INVENTORY_ANALYTICS"),
        role=os.environ.get("SNOWFLAKE_ROLE", "SYSADMIN"),
        application="smart_inventory_analytics"
    )
    try:
        yield connection
    finally:
        connection.close()
