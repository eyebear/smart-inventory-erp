# Smart Inventory ERP System

A full-stack ERP-style inventory management system for multi-store retail operations.

This project simulates an internal business application for a supermarket or grocery retail company. It focuses on inventory tracking, expiry monitoring, waste reduction, supplier integration, authentication, and role-based access control.

---

## Business Problem

Retail grocery companies manage many expiry-sensitive products across multiple store locations. Poor inventory visibility can lead to:

- Overstock
- Out-of-stock items
- Expired products
- Food waste
- Inventory mismatch between systems

This system helps monitor inventory, detect expiring products, analyze waste, and integrate modern applications with legacy systems.

---

## Tech Stack

### Frontend

- React
- TypeScript
- Next.js

### Backend

- Node.js
- Express.js
- TypeScript

### Database

- MySQL

### Legacy System Simulation

- PHP

### Security

- JWT authentication
- bcrypt password hashing
- Role-based access control

### DevOps

- Git
- GitHub
- GitHub Actions CI
- Docker
- Docker Compose
- Kubernetes
- NGINX Ingress
- Azure deployment planning

---

## Main Features

- Product master data
- Multi-store inventory tracking
- Batch-level expiry tracking
- Expiring product alerts
- Waste analytics
- Legacy PHP supplier service integration
- Login system
- JWT authentication
- Admin and Store Manager roles
- Bilingual UI with English and Chinese labels
- Docker Compose local deployment
- Local Kubernetes deployment
- Azure Kubernetes Service deployment planning

---

## Screenshots

### Dashboard

![Dashboard](docs/screenshots/dashboard.png)

### Products

![Products](docs/screenshots/products.png)

### Inventory

![Inventory](docs/screenshots/inventory.png)

### Expiring Products

![Expiring Products](docs/screenshots/expiringproducts.png)

### Waste Analytics

![Waste Analytics](docs/screenshots/wasteanalytics.png)

### Login

![Login](docs/screenshots/login.png)

---

## Demo Accounts

| Username | Password | Role |
|---|---|---|
| admin | abc123456 | ADMIN |
| richmond_manager | abc123456 | STORE_MANAGER |
| burnaby_manager | abc123456 | STORE_MANAGER |

---

## Quick Demo Guide

Follow these steps to test the system locally.

### Option 1: Run with Docker Compose

The recommended way to run the full system locally is Docker Compose.

From the project root, run:

    docker compose up --build

Then open:

    http://localhost:3000

Backend test URLs:

    http://localhost:5001/api/health

    http://localhost:5001/api/db-test

    http://localhost:5001/api/products

Login with:

| Username | Password |
|---|---|
| admin | abc123456 |
| richmond_manager | abc123456 |
| burnaby_manager | abc123456 |

To stop the application:

    docker compose down

To reset the Docker MySQL database:

    docker compose down -v
    docker compose up --build

Warning: `docker compose down -v` deletes only the Docker Compose MySQL volume. It does not delete a separate local Homebrew MySQL database.

---

### Option 2: Run with Local Kubernetes

The project can also run in a local Kubernetes cluster through Docker Desktop Kubernetes.

The local Kubernetes application URL is:

    http://smart-inventory.local

Backend test URLs through Kubernetes Ingress:

    http://smart-inventory.local/api/health

    http://smart-inventory.local/api/db-test

    http://smart-inventory.local/api/products

---

### Option 3: Run Services Manually

#### 0. Database

Database username:

    root

Database password:

    abc123456

Start MySQL:

    brew services start mysql

Load schema and seed data:

    mysql -u root -p < database/schema.sql
    mysql -u root -p < database/seed.sql

#### 1. Start backend

    cd backend
    npm install
    npm run dev

Backend runs at:

    http://localhost:5001

#### 2. Start frontend

    cd frontend
    npm install
    npm run dev

Frontend runs at:

    http://localhost:3000

#### 3. Start PHP legacy service

    cd legacy-php
    php -S localhost:8000

PHP service runs at:

    http://localhost:8000/suppliers.php

---

## Docker Compose Local Deployment

The Smart Inventory ERP system can be run locally with Docker Compose.

This starts the full application stack:

- Next.js frontend
- Node.js / Express backend
- MySQL database
- Legacy PHP supplier service

### Prerequisites

Install and start Docker Desktop.

Confirm Docker is available:

    docker --version

Confirm Docker Compose is available:

    docker compose version

### Docker Services

Docker Compose runs the following services:

| Service | Container Name | Internal Port | Local URL |
|---|---|---:|---|
| Frontend | smart-inventory-frontend | 3000 | http://localhost:3000 |
| Backend | smart-inventory-backend | 5001 | http://localhost:5001 |
| MySQL | smart-inventory-mysql | 3306 | Host port 3307 |
| Legacy PHP | smart-inventory-legacy-php | 8000 | http://localhost:8000 |

The MySQL container maps local host port `3307` to container port `3306` to avoid conflicts with a local MySQL installation that may already use port `3306`.

### Start the Full Application

From the project root, run:

    docker compose up --build

Then open:

    http://localhost:3000

### Backend Test URLs

After the containers start, verify the backend:

    http://localhost:5001/api/health

    http://localhost:5001/api/db-test

    http://localhost:5001/api/products

    http://localhost:5001/api/inventory

    http://localhost:5001/api/expiring-products

    http://localhost:5001/api/analytics/waste-summary

    http://localhost:5001/api/legacy-suppliers

### Stop the Application

To stop the containers while keeping the MySQL Docker volume:

    docker compose down

### Reset the Docker Database

If the database schema or seed data changes, reset the Docker MySQL volume:

    docker compose down -v
    docker compose up --build

Warning: `docker compose down -v` deletes the Docker Compose MySQL volume. It does not delete a separate local Homebrew MySQL database.

### Docker Networking Notes

Inside Docker Compose, containers communicate by service name.

| Connection | URL |
|---|---|
| Backend to MySQL | mysql:3306 |
| Backend to legacy PHP service | http://legacy-php:8000 |
| Frontend server-side rendering to backend | http://backend:5001 |
| Browser to backend | http://localhost:5001 |

The frontend uses two API base URLs.

| Variable | Purpose |
|---|---|
| SERVER_API_BASE_URL | Used by server-rendered Next.js pages inside the frontend container |
| NEXT_PUBLIC_API_BASE_URL | Used by browser-side client code such as login |

### Character Encoding

The Docker MySQL setup uses `utf8mb4` so Chinese product names display correctly.

Relevant files:

- database/schema.sql
- database/seed.sql
- backend/src/config/database.ts
- docker-compose.yml

---

## Local Kubernetes Deployment

The project includes Kubernetes manifests under:

    k8s/base

These manifests allow the full Smart Inventory ERP system to run in a local Kubernetes cluster.

The local Kubernetes deployment includes:

- Next.js frontend
- Node.js / Express backend
- MySQL database
- Legacy PHP supplier service
- ConfigMap for non-secret configuration
- Secret for demo credentials
- Ingress for local browser access

### Kubernetes Files

| File | Purpose |
|---|---|
| k8s/base/namespace.yaml | Creates the smart-inventory namespace |
| k8s/base/configmap.yaml | Stores non-secret application configuration |
| k8s/base/secret.yaml | Stores demo secret values for local testing |
| k8s/base/mysql.yaml | Runs MySQL for local Kubernetes testing |
| k8s/base/mysql-init-configmap.yaml | Provides schema and seed SQL files to MySQL |
| k8s/base/backend.yaml | Runs the backend Deployment and Service |
| k8s/base/frontend.yaml | Runs the frontend Deployment and Service |
| k8s/base/legacy-php.yaml | Runs the legacy PHP Deployment and Service |
| k8s/base/ingress.yaml | Exposes frontend and backend through smart-inventory.local |

### Prerequisites

Install and start Docker Desktop.

Enable Kubernetes in Docker Desktop:

    Docker Desktop → Settings → Kubernetes → Enable Kubernetes → Apply & Restart

Verify Kubernetes is running:

    kubectl get nodes

Expected result:

    STATUS should show Ready

Example:

    desktop-control-plane   Ready   control-plane

### Build Local Docker Images

Before applying Kubernetes manifests, build the local images.

Backend:

    docker build -t smart-inventory-backend:latest ./backend

Legacy PHP:

    docker build -t smart-inventory-legacy-php:latest ./legacy-php

Frontend:

    docker build \
      --build-arg NEXT_PUBLIC_API_BASE_URL=http://smart-inventory.local \
      --build-arg SERVER_API_BASE_URL=http://backend:5001 \
      -t smart-inventory-frontend:latest \
      ./frontend

The frontend build arguments are important.

| Variable | Purpose |
|---|---|
| NEXT_PUBLIC_API_BASE_URL | Browser-side API URL used by client-side code such as login |
| SERVER_API_BASE_URL | Internal Kubernetes backend URL used by server-rendered Next.js pages |

### Local Domain Setup

The local Kubernetes deployment uses:

    http://smart-inventory.local

Add this line to `/etc/hosts`:

    127.0.0.1 smart-inventory.local

If the Ingress shows a different local address, use the address shown by:

    kubectl get ingress -n smart-inventory

Example:

    172.19.0.5 smart-inventory.local

### Install NGINX Ingress Controller

Apply the NGINX Ingress Controller:

    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.1/deploy/static/provider/cloud/deploy.yaml

Check that the ingress controller is running:

    kubectl get pods -n ingress-nginx

Wait until the controller pod shows:

    Running

### Apply Kubernetes Manifests

Apply the namespace first:

    kubectl apply -f k8s/base/namespace.yaml

Then apply the application resources:

    kubectl apply -f k8s/base/configmap.yaml
    kubectl apply -f k8s/base/secret.yaml
    kubectl apply -f k8s/base/mysql-init-configmap.yaml
    kubectl apply -f k8s/base/mysql.yaml
    kubectl apply -f k8s/base/legacy-php.yaml
    kubectl apply -f k8s/base/backend.yaml
    kubectl apply -f k8s/base/frontend.yaml
    kubectl apply -f k8s/base/ingress.yaml

### Verify Kubernetes Resources

Check pods:

    kubectl get pods -n smart-inventory

Expected result:

    mysql        1/1 Running
    backend      1/1 Running
    frontend     1/1 Running
    legacy-php   1/1 Running

Check services:

    kubectl get svc -n smart-inventory

Expected services:

    mysql
    backend
    frontend
    legacy-php

Check ingress:

    kubectl get ingress -n smart-inventory

Expected host:

    smart-inventory.local

### Test the Application

Open the frontend:

    http://smart-inventory.local

Test backend through Ingress:

    http://smart-inventory.local/api/health

    http://smart-inventory.local/api/db-test

    http://smart-inventory.local/api/products

Login with:

| Username | Password | Role |
|---|---|---|
| admin | abc123456 | ADMIN |
| richmond_manager | abc123456 | STORE_MANAGER |
| burnaby_manager | abc123456 | STORE_MANAGER |

After login, verify:

- Products page
- Inventory page
- Expiring Products page
- Waste Analytics page
- Legacy supplier integration
- Chinese product names display correctly

### Useful Kubernetes Debugging Commands

Check pods:

    kubectl get pods -n smart-inventory

Check backend logs:

    kubectl logs deployment/backend -n smart-inventory

Check frontend logs:

    kubectl logs deployment/frontend -n smart-inventory

Check MySQL logs:

    kubectl logs deployment/mysql -n smart-inventory

Check legacy PHP logs:

    kubectl logs deployment/legacy-php -n smart-inventory

Describe a pod:

    kubectl describe pod <pod-name> -n smart-inventory

Restart backend:

    kubectl rollout restart deployment/backend -n smart-inventory

Restart frontend:

    kubectl rollout restart deployment/frontend -n smart-inventory

### Reset Local Kubernetes Deployment

Delete the namespace:

    kubectl delete namespace smart-inventory

Reapply from the namespace step:

    kubectl apply -f k8s/base/namespace.yaml

Then reapply the remaining manifests.

Warning: deleting the namespace removes the local Kubernetes MySQL data volume for this project.

### Local Kubernetes Networking Notes

Inside Kubernetes, services communicate by service name.

| Connection | URL |
|---|---|
| Backend to MySQL | mysql:3306 |
| Backend to legacy PHP service | http://legacy-php:8000 |
| Frontend server-side rendering to backend | http://backend:5001 |
| Browser to app through Ingress | http://smart-inventory.local |

The Ingress routes:

| Path | Service |
|---|---|
| / | frontend |
| /api | backend |

The Ingress must not rewrite `/api` paths, because the backend routes are defined with the `/api` prefix.

---

## Future Azure Kubernetes Service Deployment

The Kubernetes manifests are designed so they can later be adapted for Azure Kubernetes Service.

The future Azure deployment target may use:

- Azure Container Registry for Docker images
- Azure Kubernetes Service for application workloads
- Azure Database for MySQL for production database storage
- Kubernetes Secrets or Azure Key Vault for secret management
- Production Ingress with HTTPS and a real DNS name

### Local Images vs Azure Images

Local Kubernetes uses local image names:

- smart-inventory-backend:latest
- smart-inventory-frontend:latest
- smart-inventory-legacy-php:latest

Future AKS deployment should use Azure Container Registry image names, for example:

- smartinventoryacr.azurecr.io/smart-inventory-backend:latest
- smartinventoryacr.azurecr.io/smart-inventory-frontend:latest
- smartinventoryacr.azurecr.io/smart-inventory-legacy-php:latest

### Azure Database for MySQL

Local Kubernetes uses a MySQL pod for testing.

For production on Azure, the preferred approach is Azure Database for MySQL.

In that case, do not deploy:

    k8s/base/mysql.yaml
    k8s/base/mysql-init-configmap.yaml

Instead, update the backend environment variables:

    DB_HOST=<azure-mysql-server-name>.mysql.database.azure.com
    DB_PORT=3306
    DB_NAME=smart_inventory_erp
    DB_USER=<azure-mysql-username>

The database password should be stored securely in Kubernetes Secret, Azure Key Vault, or a secure CI/CD secret system.

### Production Ingress

Local Kubernetes uses:

    smart-inventory.local

Production should use a real domain, for example:

    smart-inventory.example.com

Production should also enable HTTPS.

Possible options include:

- NGINX Ingress Controller with TLS
- Azure Application Gateway Ingress Controller
- Azure Front Door
- cert-manager for certificate automation

### Azure Documentation

More details are documented in:

- docs/azure-container-registry-plan.md
- docs/azure-kubernetes-service-deployment-notes.md
- docs/azure-mysql-migration-notes.md

---

## System Components

| Component | Purpose |
|---|---|
| frontend | Next.js dashboard UI |
| backend | Node.js REST API |
| database | MySQL schema and seed data |
| legacy-php | Simulated legacy supplier service |
| docs | Documentation and system design |
| k8s | Kubernetes deployment manifests |
| .github/workflows | GitHub Actions CI workflows |

---

## Key API Endpoints

| Endpoint | Purpose |
|---|---|
| GET /api/products | Get product master data |
| GET /api/inventory | Get inventory batches |
| GET /api/expiring-products | Get products expiring soon |
| GET /api/analytics/waste-summary | Get waste analytics |
| POST /api/auth/login | User login |
| GET /api/legacy-suppliers | Node.js calls PHP supplier service |
| GET /api/health | Backend health check |
| GET /api/db-test | Backend database connection test |

---

## Authentication and Role-Based Access

The system supports JWT-based authentication.

Demo users:

| Username | Password | Role |
|---|---|---|
| admin | abc123456 | ADMIN |
| richmond_manager | abc123456 | STORE_MANAGER |
| burnaby_manager | abc123456 | STORE_MANAGER |

Admin users have broader access. Store Manager users have limited access based on role rules.

Example admin route test:

    GET http://localhost:5001/api/admin-test

Expected behavior:

| User | Result |
|---|---|
| admin | Success |
| store manager | Forbidden |

---

## Legacy PHP Integration

The project includes a simulated legacy PHP supplier service.

When running manually, the PHP service runs at:

    http://localhost:8000/suppliers.php

When running inside Docker Compose or Kubernetes, the backend calls the PHP service by internal service name:

    http://legacy-php:8000

Backend integration endpoint:

    http://localhost:5001/api/legacy-suppliers

or through local Kubernetes ingress:

    http://smart-inventory.local/api/legacy-suppliers

---

## Local Development

### 1. Start MySQL

    brew services start mysql

Load schema and seed data:

    mysql -u root -p < database/schema.sql
    mysql -u root -p < database/seed.sql

### 2. Start backend

    cd backend
    npm install
    npm run dev

Backend runs at:

    http://localhost:5001

### 3. Start frontend

    cd frontend
    npm install
    npm run dev

Frontend runs at:

    http://localhost:3000

### 4. Start PHP legacy service

    cd legacy-php
    php -S localhost:8000

PHP service runs at:

    http://localhost:8000/suppliers.php

---

## CI/CD

GitHub Actions automatically checks:

- Backend build
- Frontend build
- Frontend lint
- PHP syntax
- Documentation files
- Docker image builds
- Docker Compose configuration

Docker build checks verify:

- Backend Docker image builds successfully
- Frontend Docker image builds successfully
- Legacy PHP Docker image builds successfully
- Docker Compose configuration is valid

---

## Azure Deployment Planning

This project includes planning documentation for future Azure deployment.

Relevant documents:

- docs/azure-container-registry-plan.md
- docs/azure-kubernetes-service-deployment-notes.md
- docs/azure-mysql-migration-notes.md

The future Azure target architecture may use:

- Azure Container Registry for Docker images
- Azure Kubernetes Service for application workloads
- Azure Database for MySQL for production database storage
- Kubernetes Secrets or Azure Key Vault for secret management
- Production Ingress with HTTPS and a real DNS name

The current verified deployment targets are:

- Local manual development
- Docker Compose local deployment
- Local Kubernetes deployment

---

## Project Highlights for Recruiters

- Full-stack ERP-style system
- Real-world business modeling for inventory, expiry, and waste
- JWT authentication and role-based access control
- Integration with a simulated legacy PHP system
- Clean separation of frontend, backend, database, and legacy services
- Dockerized multi-service architecture
- Docker Compose one-command local deployment
- Kubernetes manifests for local and future cloud deployment
- GitHub Actions CI with Docker build validation
- Azure deployment planning for ACR, AKS, and Azure MySQL
- Bilingual English and Chinese UI support

---

## Documentation

See:

- docs/API_SPEC.md
- docs/ARCHITECTURE.md
- docs/WORKFLOW.md
- docs/SRS.md
- docs/docker-database-initialization.md
- docs/azure-container-registry-plan.md
- docs/azure-kubernetes-service-deployment-notes.md
- docs/azure-mysql-migration-notes.md

---

## Summary

This project demonstrates:

- Full-stack development
- API design
- Database modeling
- Authentication and authorization
- Real-world enterprise architecture
- Legacy system integration
- Docker containerization
- Docker Compose orchestration
- Kubernetes deployment preparation
- CI/CD workflow design
- Azure cloud deployment planning