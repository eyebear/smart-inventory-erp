# Deployment Scope

## Purpose

This document defines the containerization and deployment scope for the Smart Inventory ERP system.

The goal of Phase 9 is to make the project portable across local Docker development, local Kubernetes testing, and future Azure deployment.

## Services to Containerize

The Smart Inventory ERP system contains four runtime services that should be containerized.

| Service | Folder | Technology | Purpose | Port |
|---|---|---|---|---|
| Frontend | frontend | Next.js / React / TypeScript | Web dashboard for users | 3000 |
| Backend API | backend | Node.js / Express / TypeScript | REST API, authentication, business logic, database access | 5001 |
| Legacy PHP Service | legacy-php | PHP | Simulated legacy supplier integration service | 8000 |
| Database | database | MySQL | Stores products, suppliers, inventory, users, and waste records | 3306 |

## Services Not Containerized

| Folder | Reason |
|---|---|
| docs | Documentation does not run as a service |
| .github | GitHub Actions configuration is used by GitHub CI, not by the runtime application |

## Local Docker Target

For local Docker development, all four runtime services will run through Docker Compose:

1. frontend
2. backend
3. legacy-php
4. mysql

This allows the full system to start with one command.

## Kubernetes Target

For Kubernetes testing, each runtime service will be converted into Kubernetes manifests.

The expected Kubernetes resources are:

| Service | Kubernetes Resources |
|---|---|
| Frontend | Deployment, Service |
| Backend API | Deployment, Service |
| Legacy PHP Service | Deployment, Service |
| MySQL | Deployment or StatefulSet, Service, PersistentVolumeClaim |
| Shared Configuration | ConfigMap, Secret |
| External Access | Ingress |

## Azure Target

The project will be prepared for future Azure deployment.

The recommended Azure production mapping is:

| Local / Kubernetes Component | Future Azure Service |
|---|---|
| Docker images | Azure Container Registry |
| Kubernetes workloads | Azure Kubernetes Service |
| MySQL container | Azure Database for MySQL |
| Secrets | Kubernetes Secrets or Azure Key Vault |
| Public access | AKS Ingress Controller |

## Important Networking Rule

Inside Docker Compose and Kubernetes, services should communicate by service name, not by localhost.

Examples:

| Component | Local URL | Container/Kubernetes URL |
|---|---|---|
| Backend API from frontend | http://localhost:5001 | http://backend:5001 |
| PHP service from backend | http://localhost:8000 | http://legacy-php:8000 |
| MySQL from backend | localhost:3306 | mysql:3306 |

## Final Decision

The Smart Inventory ERP project will be containerized as a four-service system:

- Next.js frontend
- Node.js backend API
- PHP legacy supplier service
- MySQL database

This design supports local Docker development, local Kubernetes testing, and future Azure deployment without changing the core application architecture.