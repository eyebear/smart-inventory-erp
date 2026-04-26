# Smart Inventory ERP System

A full-stack ERP-style inventory management system for multi-store retail operations.

This project simulates an internal business application for a supermarket or grocery retail company. It focuses on inventory tracking, expiry monitoring, waste reduction, supplier integration, authentication, and role-based access control.

## Business Problem

Retail grocery companies manage many expiry-sensitive products across multiple store locations. Poor inventory visibility can lead to:

- Overstock
- Out-of-stock items
- Expired products
- Food waste
- Inventory mismatch between systems

This system helps store managers and administrators monitor inventory, detect expiring products, analyze waste, and integrate modern applications with legacy systems.

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
- Bilingual UI labels: English / Chinese

## System Components

| Component | Purpose |
|---|---|
| frontend | Next.js dashboard UI |
| backend | Node.js REST API |
| database | MySQL schema and seed data |
| legacy-php | Simulated legacy supplier service |
| docs | Documentation and system design |

## Demo Accounts

| Username | Password | Role |
|---|---|---|
| admin | abc123456 | ADMIN |
| richmond_manager | abc123456 | STORE_MANAGER |
| burnaby_manager | abc123456 | STORE_MANAGER |

## Local Development

### 1. Start MySQL

```bash
brew services start mysql
```
Load schema and seed data:
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

### 2. Start backend
```bash
cd backend
npm install
npm run dev
```
Backend runs at:

http://localhost:5001

### 3. Start frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

http://localhost:3000

### 4. Start PHP legacy service
```bash
cd legacy-php
php -S localhost:8000
```

PHP service runs at:

http://localhost:8000/suppliers.php

### Key API Endpoints
Endpoint	Purpose
GET /api/products	Get product master data
GET /api/inventory	Get inventory batches
GET /api/expiring-products	Get products expiring soon
GET /api/analytics/waste-summary	Get waste analytics
POST /api/auth/login	User login
GET /api/legacy-suppliers	Node.js calls PHP supplier service

## CI/CD
### GitHub Actions checks:

Backend build
Frontend build
Frontend lint
PHP syntax
Required documentation files

## Project Purpose

This project demonstrates full-stack enterprise application development for retail operations, including modern web development, relational database design, API development, authentication, role-based access control, and legacy system integration.