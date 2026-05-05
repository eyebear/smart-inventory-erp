# Docker Environment Configuration

## Purpose

This document explains the environment variables used when running Smart Inventory ERP through Docker Compose.

The project supports two local development modes:

1. Running services directly on the host machine
2. Running services through Docker Compose

Docker Compose uses different networking values because containers communicate through Docker service names.

## Backend Environment Variables

| Variable | Docker Compose Value | Purpose |
|---|---|---|
| NODE_ENV | production | Runs backend in production mode |
| PORT | 5001 | Backend API port |
| DB_HOST | mysql | Docker Compose service name for MySQL |
| DB_PORT | 3306 | MySQL port inside Docker network |
| DB_USER | root | MySQL user for local Docker demo |
| DB_PASSWORD | abc123456 | MySQL password for local Docker demo |
| DB_NAME | smart_inventory_erp | Application database name |
| JWT_SECRET | smart_inventory_demo_secret_change_later | JWT signing secret for local Docker demo |
| PHP_SERVICE_URL | http://legacy-php:8000 | Docker Compose service URL for legacy PHP service |

## Frontend Environment Variables

| Variable | Docker Compose Value | Purpose |
|---|---|---|
| NODE_ENV | production | Runs frontend in production mode |
| PORT | 3000 | Frontend port |
| HOSTNAME | 0.0.0.0 | Allows Next.js to listen inside container |
| NEXT_PUBLIC_API_BASE_URL | http://localhost:5001 | Browser-accessible backend API URL |

## MySQL Environment Variables

| Variable | Docker Compose Value | Purpose |
|---|---|---|
| MYSQL_ROOT_PASSWORD | abc123456 | Root password for local Docker MySQL |
| MYSQL_DATABASE | smart_inventory_erp | Database created at container initialization |

## Important Networking Rules

Inside Docker Compose, containers should communicate by service name.

| Connection | Correct Value |
|---|---|
| Backend to MySQL | mysql:3306 |
| Backend to PHP service | http://legacy-php:8000 |
| Browser to frontend | http://localhost:3000 |
| Browser to backend | http://localhost:5001 |

The MySQL container is exposed to the Mac through port 3307:

| Location | Port |
|---|---|
| Mac host | 3307 |
| MySQL container | 3306 |

Therefore, the backend still uses DB_PORT=3306 because it runs inside the Docker network.

## Local Docker Only

The values in docker-compose.yml are for local Docker development only.

For production Azure or Kubernetes deployment, sensitive values such as database passwords and JWT secrets should be moved to Kubernetes Secrets, Azure Key Vault, or secure CI/CD environment variables.