import pytest
from pyspark.sql import SparkSession


@pytest.fixture(scope="session")
def spark_session():
    session = (
        SparkSession.builder.master("local[2]")
        .appName("smart-inventory-analytics-tests")
        .config("spark.ui.enabled", "false")
        .getOrCreate()
    )
    yield session
    session.stop()
