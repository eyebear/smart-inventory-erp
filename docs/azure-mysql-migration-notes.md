# Azure MySQL Migration Notes

## Purpose

This document explains how the Smart Inventory ERP database can be migrated from local containerized MySQL to Azure Database for MySQL in a future production deployment.

The current project supports local development and testing with:

- Docker Compose MySQL
- Local Kubernetes MySQL
- SQL initialization from `database/schema.sql`
- SQL seed data from `database/seed.sql`

For production on Azure, the recommended approach is to use Azure Database for MySQL instead of running MySQL as a container inside AKS.

## Current Local Database Setup

The local Docker Compose setup uses the official MySQL image:

    mysql:8.4

The database is initialized using:

    database/schema.sql
    database/seed.sql

The local Docker Compose MySQL service uses:

    DB_HOST=mysql
    DB_PORT=3306
    DB_NAME=smart_inventory_erp
    DB_USER=root
    DB_PASSWORD=abc123456

The Docker Compose host port mapping is:

    3307:3306

This avoids conflict with a local Homebrew MySQL instance running on port `3306`.

## Current Local Kubernetes Database Setup

The local Kubernetes setup includes:

    k8s/base/mysql.yaml
    k8s/base/mysql-init-configmap.yaml

The MySQL service name is:

    mysql

The backend connects to MySQL through the Kubernetes internal service name:

    mysql:3306

This is useful for local Kubernetes testing, but it is not the preferred production database architecture.

## Target Azure Database Architecture

For production Azure deployment, use:

    Azure Database for MySQL Flexible Server

The backend should connect to Azure MySQL instead of the Kubernetes MySQL service.

In production:

- Do not deploy `k8s/base/mysql.yaml`
- Do not deploy `k8s/base/mysql-init-configmap.yaml`
- Store production database credentials securely
- Use Azure Database for MySQL backups and monitoring
- Restrict database network access
- Use SSL/TLS if required by Azure database configuration

## Production Environment Variable Changes

Local Kubernetes uses:

    DB_HOST=mysql
    DB_PORT=3306
    DB_NAME=smart_inventory_erp
    DB_USER=root

Production Azure MySQL should use values similar to:

    DB_HOST=<azure-mysql-server-name>.mysql.database.azure.com
    DB_PORT=3306
    DB_NAME=smart_inventory_erp
    DB_USER=<azure-mysql-username>
    DB_PASSWORD=<secure-production-password>

The actual values depend on the Azure MySQL server created later.

## ConfigMap Changes

For local Kubernetes, `k8s/base/configmap.yaml` has:

    DB_HOST: "mysql"
    DB_PORT: "3306"
    DB_NAME: "smart_inventory_erp"
    DB_USER: "root"

For production, create a production ConfigMap or overlay with:

    DB_HOST: "<azure-mysql-server-name>.mysql.database.azure.com"
    DB_PORT: "3306"
    DB_NAME: "smart_inventory_erp"
    DB_USER: "<azure-mysql-username>"

Do not store the database password in the ConfigMap.

## Secret Changes

For local testing, `k8s/base/secret.yaml` contains demo values:

    DB_PASSWORD: "abc123456"
    MYSQL_ROOT_PASSWORD: "abc123456"
    JWT_SECRET: "smart_inventory_demo_secret_change_later"

For production:

- Replace `DB_PASSWORD` with the Azure MySQL password
- Replace `JWT_SECRET` with a strong production secret
- Remove `MYSQL_ROOT_PASSWORD` if MySQL is no longer deployed inside Kubernetes
- Do not commit real production secrets to GitHub

Recommended options for production secrets:

- Kubernetes Secret created directly in AKS
- GitHub Actions encrypted secrets
- Azure Key Vault
- Azure Key Vault CSI Driver

## Schema Migration Plan

The current schema is stored in:

    database/schema.sql

For first-time Azure MySQL setup, use this file to create the database structure.

Possible initialization command:

    mysql \
      -h <azure-mysql-server-name>.mysql.database.azure.com \
      -P 3306 \
      -u <azure-mysql-username> \
      -p \
      --default-character-set=utf8mb4 \
      smart_inventory_erp < database/schema.sql

The schema file includes UTF-8 settings for Chinese product names:

    SET NAMES utf8mb4;
    SET CHARACTER SET utf8mb4;

The database and tables should use:

    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci

## Seed Data Plan

The current demo seed data is stored in:

    database/seed.sql

For a demo Azure environment, seed data can be loaded with:

    mysql \
      -h <azure-mysql-server-name>.mysql.database.azure.com \
      -P 3306 \
      -u <azure-mysql-username> \
      -p \
      --default-character-set=utf8mb4 \
      smart_inventory_erp < database/seed.sql

For a real production environment, demo seed data should be reviewed before use.

Production data should not rely on demo users or demo inventory records.

## UTF-8 Requirement

The project contains Chinese product names, so Azure MySQL must preserve UTF-8 text.

Required settings:

- Database character set: `utf8mb4`
- Database collation: `utf8mb4_unicode_ci`
- MySQL client import option: `--default-character-set=utf8mb4`
- Backend MySQL client setting: `charset: "utf8mb4"`

The backend already uses `charset: "utf8mb4"` in:

    backend/src/config/database.ts

This prevents Chinese text from becoming corrupted when read from MySQL.

## Application Configuration After Migration

After Azure MySQL is ready, the backend Kubernetes Deployment should continue using the same environment variable names:

    DB_HOST
    DB_PORT
    DB_USER
    DB_PASSWORD
    DB_NAME

Only the values change.

No backend code change should be needed if the environment variables are correctly updated.

## Local Kubernetes vs Azure MySQL

Local Kubernetes:

    backend -> mysql service -> MySQL pod

Azure production:

    backend pod -> Azure Database for MySQL

This means the backend should no longer depend on the Kubernetes `mysql` service in production.

## Files Not Deployed in Production

When using Azure Database for MySQL, skip these files in production deployment:

    k8s/base/mysql.yaml
    k8s/base/mysql-init-configmap.yaml

These are only for local Kubernetes testing.

## Future Recommended Improvement

For a more professional production setup, consider adding a database migration tool instead of manually running SQL files.

Possible options:

- Flyway
- Liquibase
- Prisma migrations
- TypeORM migrations
- Knex migrations

For the current portfolio/demo project, `schema.sql` and `seed.sql` are acceptable.

## Migration Checklist

Before migration:

- Azure Database for MySQL server exists
- Database name is created
- Firewall or private networking allows AKS access
- Production database user exists
- Production password is stored securely
- Database character set is `utf8mb4`
- Database collation is `utf8mb4_unicode_ci`

During migration:

- Run `database/schema.sql`
- Optionally run `database/seed.sql`
- Verify tables exist
- Verify Chinese product names display correctly
- Update Kubernetes ConfigMap for Azure DB host/user/name
- Update Kubernetes Secret for Azure DB password
- Redeploy backend
- Test `/api/db-test`
- Test `/api/products`
- Test login
- Test products, inventory, expiring products, analytics, and legacy suppliers

After migration:

- Confirm backend no longer connects to local Kubernetes MySQL
- Confirm AKS workload can reach Azure MySQL
- Confirm demo credentials are replaced if needed
- Confirm no production secrets are committed to GitHub
- Confirm database backups are enabled
- Confirm monitoring is enabled

## Smoke Test Commands

Backend health:

    http://<production-domain>/api/health

Database connection:

    http://<production-domain>/api/db-test

Products API:

    http://<production-domain>/api/products

Frontend:

    http://<production-domain>

Login:

    admin / abc123456

For real production, replace demo users with secure production accounts.

## Notes

This document is a future migration guide. It does not mean the project is already using Azure Database for MySQL.

The current verified environments are:

- Docker Compose local deployment
- Local Kubernetes deployment

Azure Database for MySQL migration can be performed later when Azure resources are available.