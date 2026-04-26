# System Workflow

## Overview

This document describes the business workflows supported by the Smart Inventory ERP system.

---

## 1. User Authentication Workflow

User enters username and password
    ↓
Frontend sends POST /api/auth/login
    ↓
Backend validates credentials using bcrypt
    ↓
JWT token is generated
    ↓
Frontend stores token in localStorage
    ↓
Token is sent in future API requests

---

## 2. Product Management Workflow

Admin manages product master data

- Products include SKU, name, category, origin, supplier
- Product data is stored in MySQL
- Frontend retrieves via:

GET /api/products

---

## 3. Inventory Tracking Workflow

Inventory is tracked at batch level

Each batch includes:

- Product ID
- Store ID
- Quantity
- Expiry date
- Received date

Workflow:

Inventory received at store
    ↓
Batch created in database
    ↓
Frontend displays inventory via:
GET /api/inventory

---

## 4. Expiry Monitoring Workflow

System detects products nearing expiry

Workflow:

Current date checked
    ↓
Compare with expiry_date
    ↓
Filter products within X days
    ↓
Return results via:
GET /api/expiring-products

Purpose:

- Reduce food waste
- Alert store managers
- Enable markdown or promotion

---

## 5. Waste Tracking Workflow

Expired or damaged products are recorded

Workflow:

Product expires or is damaged
    ↓
Record added to waste_records table
    ↓
Includes:
- quantity_wasted
- reason
- estimated_loss

---

## 6. Waste Analytics Workflow

System aggregates waste data

Workflow:

Fetch waste_records
    ↓
Group by store and category
    ↓
Calculate:
- total_quantity_wasted
- total_estimated_loss
    ↓
Return via:
GET /api/analytics/waste-summary

---

## 7. Legacy Supplier Integration Workflow

System integrates with legacy PHP service

Workflow:

Frontend requests supplier data
    ↓
GET /api/legacy-suppliers
    ↓
Node.js backend calls:
http://localhost:8000/suppliers.php
    ↓
PHP returns supplier data
    ↓
Node.js forwards response to frontend

---

## 8. Role-Based Access Workflow

Users have roles:

- ADMIN
- STORE_MANAGER

Workflow:

User logs in
    ↓
JWT token contains role
    ↓
Backend middleware checks role

Examples:

ADMIN:
- Access all data
- View analytics

STORE_MANAGER:
- Limited access
- Restricted to assigned store

---

## Summary

This system models real-world retail operations:

- Inventory tracking
- Expiry monitoring
- Waste reduction
- Supplier integration
- Secure user access