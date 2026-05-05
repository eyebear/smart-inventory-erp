# Azure Kubernetes Service Deployment Notes

## Purpose

This document explains how the Smart Inventory ERP Kubernetes manifests can be adapted for a future Azure Kubernetes Service deployment.

The project already supports:

- Docker Compose local deployment
- Local Kubernetes deployment
- Kubernetes manifests for frontend, backend, legacy PHP, MySQL, ConfigMap, Secret, and Ingress

The future Azure deployment target is Azure Kubernetes Service.

## Current Local Kubernetes Setup

The local Kubernetes setup uses these manifests:

- `k8s/base/namespace.yaml`
- `k8s/base/configmap.yaml`
- `k8s/base/secret.yaml`
- `k8s/base/mysql-init-configmap.yaml`
- `k8s/base/mysql.yaml`
- `k8s/base/backend.yaml`
- `k8s/base/frontend.yaml`
- `k8s/base/legacy-php.yaml`
- `k8s/base/ingress.yaml`

The local Kubernetes deployment uses local Docker image names:

- `smart-inventory-backend:latest`
- `smart-inventory-frontend:latest`
- `smart-inventory-legacy-php:latest`

For AKS, these images should be replaced with Azure Container Registry image names.

## Future Azure Target Architecture

The future Azure architecture should use:

- Azure Kubernetes Service for application workloads
- Azure Container Registry for Docker images
- Azure Database for MySQL for production database storage
- Kubernetes Secrets, Azure Key Vault, or a secure CI/CD secret injection process for sensitive values
- NGINX Ingress Controller, Azure Application Gateway Ingress Controller, or another production ingress solution
- A real DNS name instead of `smart-inventory.local`
- HTTPS/TLS certificates for secure access

## Expected Azure Resources

A future AKS deployment would require these Azure resources:

- Resource group
- Azure Container Registry
- Azure Kubernetes Service cluster
- Azure Database for MySQL instance
- Networking configuration
- Public IP address or ingress load balancer
- DNS record
- TLS certificate or certificate manager setup

## Image Registry Change

Local Kubernetes currently uses local image names.

For AKS, change backend image from:

    image: smart-inventory-backend:latest

to:

    image: smartinventoryacr.azurecr.io/smart-inventory-backend:latest

Change frontend image from:

    image: smart-inventory-frontend:latest

to:

    image: smartinventoryacr.azurecr.io/smart-inventory-frontend:latest

Change legacy PHP image from:

    image: smart-inventory-legacy-php:latest

to:

    image: smartinventoryacr.azurecr.io/smart-inventory-legacy-php:latest

The actual registry name may be different depending on the Azure Container Registry created later.

## AKS Image Pull Access

AKS must be able to pull images from Azure Container Registry.

Common options include:

- Attach Azure Container Registry to AKS during cluster creation
- Attach Azure Container Registry to an existing AKS cluster
- Use an image pull secret

Example future command:

    az aks update \
      --name smart-inventory-aks \
      --resource-group smart-inventory-rg \
      --attach-acr smartinventoryacr

## Database Change for Production

The local Kubernetes setup currently includes a MySQL deployment:

- `k8s/base/mysql.yaml`

For production on Azure, the preferred option is to replace this local MySQL container with Azure Database for MySQL.

In that case:

- Do not deploy `k8s/base/mysql.yaml` to production AKS
- Do not deploy `k8s/base/mysql-init-configmap.yaml` to production AKS unless needed for controlled initialization
- Update `DB_HOST` to the Azure MySQL host name
- Update `DB_PORT` to `3306`
- Update `DB_NAME` to the production database name
- Store `DB_PASSWORD` in a Kubernetes Secret or Azure Key Vault

## ConfigMap Changes for AKS

The local ConfigMap currently contains development values such as:

    NEXT_PUBLIC_API_BASE_URL: "http://localhost:5001"
    SERVER_API_BASE_URL: "http://backend:5001"

For AKS production, these values should be changed.

Example production values:

    NEXT_PUBLIC_API_BASE_URL: "https://smart-inventory.example.com"
    SERVER_API_BASE_URL: "http://backend:5001"

Reason:

- Browser-side frontend requests should use the public HTTPS domain.
- Server-side frontend requests can use the internal Kubernetes backend service.

## Secret Changes for AKS

The local `k8s/base/secret.yaml` contains demo credentials.

For AKS production:

- Do not commit real production secrets to GitHub
- Replace demo values with secure values injected during deployment
- Store database passwords securely
- Store JWT secret securely
- Rotate secrets when needed

Recommended options:

- Kubernetes Secret created manually in the AKS cluster
- GitHub Actions encrypted secrets
- Azure Key Vault
- Azure Key Vault CSI Driver

## Ingress Changes for AKS

The local Ingress uses:

    host: smart-inventory.local

For AKS production, replace it with a real DNS name, for example:

    host: smart-inventory.example.com

The Ingress should route:

- `/` to the frontend service
- `/api` to the backend service

The production Ingress should also support HTTPS.

Possible production ingress options:

- NGINX Ingress Controller with TLS
- Azure Application Gateway Ingress Controller
- Azure Front Door in front of AKS
- cert-manager for automatic TLS certificates

## High-Level AKS Deployment Flow

A future AKS deployment may follow this order:

1. Create Azure resource group
2. Create Azure Container Registry
3. Build Docker images
4. Tag Docker images for ACR
5. Push Docker images to ACR
6. Create AKS cluster
7. Attach ACR to AKS
8. Create Azure Database for MySQL
9. Create production Kubernetes Secret
10. Update ConfigMap for production domain and database host
11. Update Kubernetes image names to ACR image names
12. Install Ingress controller
13. Apply Kubernetes manifests
14. Configure DNS
15. Configure HTTPS
16. Run smoke tests

## Example Future Deployment Commands

Create resource group:

    az group create \
      --name smart-inventory-rg \
      --location canadacentral

Create Azure Container Registry:

    az acr create \
      --resource-group smart-inventory-rg \
      --name smartinventoryacr \
      --sku Basic

Create AKS cluster:

    az aks create \
      --resource-group smart-inventory-rg \
      --name smart-inventory-aks \
      --node-count 1 \
      --generate-ssh-keys \
      --attach-acr smartinventoryacr

Get AKS credentials:

    az aks get-credentials \
      --resource-group smart-inventory-rg \
      --name smart-inventory-aks

Apply Kubernetes manifests:

    kubectl apply -f k8s/base/namespace.yaml
    kubectl apply -f k8s/base/configmap.yaml
    kubectl apply -f k8s/base/secret.yaml
    kubectl apply -f k8s/base/backend.yaml
    kubectl apply -f k8s/base/frontend.yaml
    kubectl apply -f k8s/base/legacy-php.yaml
    kubectl apply -f k8s/base/ingress.yaml

For production with Azure Database for MySQL, skip:

    k8s/base/mysql.yaml
    k8s/base/mysql-init-configmap.yaml

## Smoke Test Checklist

After deployment, verify:

- Frontend loads from the public domain
- Login works
- Backend health endpoint works
- Database connection works
- Products page loads
- Inventory page loads
- Expiring products page loads
- Waste analytics page loads
- Legacy supplier integration works
- Chinese product names display correctly
- HTTPS is enabled
- No real secrets are committed to GitHub

## Notes

This document is a future deployment guide. It does not mean the project has already been deployed to Azure.

The current completed deployment target is local Docker Compose and local Kubernetes. AKS deployment can be performed later when Azure resources are available.