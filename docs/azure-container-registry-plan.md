# Azure Container Registry Plan

## Purpose

This document describes how Smart Inventory ERP Docker images will be prepared for future deployment to Azure Kubernetes Service.

The project currently builds Docker images locally for:

- backend
- frontend
- legacy PHP supplier service

For Azure deployment, these images will be tagged and pushed to Azure Container Registry.

## Current Local Images

The local Docker images are:

- `smart-inventory-backend:latest`
- `smart-inventory-frontend:latest`
- `smart-inventory-legacy-php:latest`

These images are used for local Docker Compose and local Kubernetes testing.

## Future Azure Container Registry

A future Azure Container Registry may use a name such as:

- `smartinventoryacr`

The full Azure image names would become:

- `smartinventoryacr.azurecr.io/smart-inventory-backend:latest`
- `smartinventoryacr.azurecr.io/smart-inventory-frontend:latest`
- `smartinventoryacr.azurecr.io/smart-inventory-legacy-php:latest`

## Image Tagging Plan

Backend:

    docker tag smart-inventory-backend:latest smartinventoryacr.azurecr.io/smart-inventory-backend:latest

Frontend:

    docker tag smart-inventory-frontend:latest smartinventoryacr.azurecr.io/smart-inventory-frontend:latest

Legacy PHP:

    docker tag smart-inventory-legacy-php:latest smartinventoryacr.azurecr.io/smart-inventory-legacy-php:latest

## Image Push Plan

Login to Azure Container Registry:

    az acr login --name smartinventoryacr

Push backend image:

    docker push smartinventoryacr.azurecr.io/smart-inventory-backend:latest

Push frontend image:

    docker push smartinventoryacr.azurecr.io/smart-inventory-frontend:latest

Push legacy PHP image:

    docker push smartinventoryacr.azurecr.io/smart-inventory-legacy-php:latest

## Kubernetes Image Replacement Plan

Current local Kubernetes manifests use local images:

- `smart-inventory-backend:latest`
- `smart-inventory-frontend:latest`
- `smart-inventory-legacy-php:latest`

For Azure Kubernetes Service, these image references should be changed to ACR image references:

- `smartinventoryacr.azurecr.io/smart-inventory-backend:latest`
- `smartinventoryacr.azurecr.io/smart-inventory-frontend:latest`
- `smartinventoryacr.azurecr.io/smart-inventory-legacy-php:latest`

## Production Notes

For production deployment:

- Do not store real secrets in GitHub.
- Use Azure Key Vault or Kubernetes Secrets managed through a secure deployment process.
- Replace local MySQL with Azure Database for MySQL.
- Replace local domain `smart-inventory.local` with a real DNS name.
- Use HTTPS through a production Ingress controller or Azure Application Gateway.