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
- Bilingual UI (English / Chinese)

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

Follow these steps to test the system locally:
### 0. Database
Username: root
Password: abc123456
### 1. Start all services

Backend:

    cd backend
    npm run dev

Frontend:

    cd frontend
    npm run dev

PHP legacy service:

    cd legacy-php
    php -S localhost:8000

---

### 2. Open the application

    http://localhost:3000

---

### 3. Login

Use:

| Username | Password |
|---|---|
| admin | abc123456 |
| richmond_manager | abc123456 |

---

### 4. Test features

After login:

- View Products page
- View Inventory page
- Check Expiring Products
- View Waste Analytics

---

### 5. Test role-based access

Admin:

- Full access
- Can access admin-only endpoints

Store Manager:

- Limited permissions
- Cannot access admin-only routes

Example test:

Use Postman:

    GET http://localhost:5001/api/admin-test

- admin → success
- store_manager → forbidden

---

### 6. Test legacy integration

    http://localhost:5001/api/legacy-suppliers

This confirms Node.js successfully calls the PHP service.

## System Components

| Component | Purpose |
|---|---|
| frontend | Next.js dashboard UI |
| backend | Node.js REST API |
| database | MySQL schema and seed data |
| legacy-php | Simulated legacy supplier service |
| docs | Documentation and system design |

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

---

## Local Development

### 1. Start MySQL

    brew services start mysql

Load schema and seed data:

    mysql -u root -p < database/schema.sql
    mysql -u root -p < database/seed.sql

---

### 2. Start backend

    cd backend
    npm install
    npm run dev

Backend runs at:

    http://localhost:5001

---

### 3. Start frontend

    cd frontend
    npm install
    npm run dev

Frontend runs at:

    http://localhost:3000

---

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

---

## Project Highlights (For Recruiters)

- Full-stack ERP-style system
- Real-world business modeling (inventory, expiry, waste)
- JWT authentication and RBAC security
- Integration with legacy PHP system
- Clean separation of frontend, backend, and services
- Production-style project structure

---

## Documentation

See:

- docs/API_SPEC.md
- docs/ARCHITECTURE.md
- docs/WORKFLOW.md
- docs/SRS.md

---

## Summary

This project demonstrates:

- Full-stack development
- API design
- Database modeling
- Authentication and authorization
- Real-world enterprise architecture
- Legacy system integration
