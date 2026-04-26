# System Architecture

## Overview

The Smart Inventory ERP system is a full-stack application designed to simulate a real-world retail inventory management system. It integrates modern web technologies with a legacy PHP service.

---

## High-Level Architecture

Frontend (Next.js)
    ↓
Node.js Backend (Express)
    ↓
MySQL Database

Node.js Backend
    ↓
PHP Legacy Service

---

## Components

### 1. Frontend (Next.js)

- Built with React + TypeScript
- Provides dashboard UI
- Displays products, inventory, expiry, and analytics
- Handles login and token storage
- Calls backend APIs

---

### 2. Backend (Node.js + Express)

- REST API server
- Handles business logic
- Connects to MySQL database
- Implements authentication (JWT)
- Implements role-based access control
- Calls legacy PHP service

---

### 3. Database (MySQL)

- Stores:
  - Users
  - Products
  - Inventory batches
  - Waste records
  - Stores
  - Suppliers
- Supports relational queries for analytics

---

### 4. Legacy PHP Service

- Simulates older supplier system
- Runs separately on port 8000
- Returns supplier data as JSON
- Accessed by Node.js backend

---

## Authentication Flow

User → Login Page
    ↓
POST /api/auth/login
    ↓
Backend validates user (bcrypt)
    ↓
JWT token returned
    ↓
Frontend stores token (localStorage)
    ↓
Token sent in Authorization header

---

## Authorization (RBAC)

Roles:

- ADMIN
- STORE_MANAGER

Rules:

- ADMIN → full access
- STORE_MANAGER → restricted access

Middleware:

- authenticateToken → verifies JWT
- requireRole → enforces role permissions

---

## Data Flow Example

Inventory Page:

Frontend → GET /api/inventory
    ↓
Backend queries MySQL
    ↓
Returns batch-level inventory data

---

## Legacy Integration Flow

Frontend → /api/legacy-suppliers
    ↓
Node.js backend
    ↓
Calls PHP service (/suppliers.php)
    ↓
Returns supplier data

---

## Key Design Decisions

- Separation of concerns (frontend / backend / DB)
- Service layer for external integration
- JWT for stateless authentication
- Role middleware for access control
- Simulated legacy system for realism

---

## Summary

This system demonstrates:

- Full-stack architecture
- API-driven design
- Secure authentication
- Role-based access control
- Integration with legacy systems