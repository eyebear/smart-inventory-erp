FROM apache/airflow:3.3.0-python3.12

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       curl \
       default-mysql-client \
       jq \
       openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

USER airflow
COPY analytics/requirements.txt /tmp/analytics-requirements.txt
RUN pip install --no-cache-dir -r /tmp/analytics-requirements.txt
