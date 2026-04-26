# Inventory Sync and Waste Reduction System

## Project Goal

Build a full-stack internal ERP-style application for a multi-store Asian supermarket chain. The system helps store managers track inventory, monitor expiry dates, reduce food waste, and synchronize data between modern APIs and a simulated legacy PHP service.

## Users

### Admin

- View all stores
- Manage products, suppliers, and inventory
- View waste analytics

### Store Manager

- View assigned store inventory
- Update inventory quantities
- View expiring product alerts

## Core Features

### Product Management

- Store English and Chinese product names
- Track product category
- Track country of origin
- Track supplier information

### Multi-Store Inventory

- Track inventory by store
- Track inventory by batch
- Track expiry dates
- Update stock quantity

### Expiry Alert System

- Detect products expiring within 3 days
- Display warning alerts for store managers

### Waste Tracking

- Record expired or discarded inventory
- Calculate waste quantity and waste cost

### Legacy PHP Integration

- Simulate an older supplier or ERP module using PHP
- Node.js backend calls the PHP service through HTTP

### Analytics Dashboard

- Show low-stock products
- Show expiring products
- Show waste by store, category, and supplier

## Tech Stack

### Frontend

- React
- TypeScript
- Next.js

### Backend

- Node.js
- TypeScript
- Express.js or NestJS

### Database

- MySQL
- Optional later: Microsoft SQL Server for reporting

### Legacy System Simulation

- PHP

### DevOps

- Git
- GitHub
- GitHub Actions CI

### Security

- JWT authentication
- Role-based access control