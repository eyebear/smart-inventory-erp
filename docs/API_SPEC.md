# API Specification

This document describes all backend API endpoints for the Smart Inventory ERP system.

---

## Base URL

http://localhost:5001

---

## Authentication

Protected endpoints require:

Authorization: Bearer <JWT_TOKEN>

---

## 1. Products

### GET /api/products

Returns product master data.

#### Response

    [
      {
        "id": 1,
        "sku": "TOFU-001",
        "name_en": "Soft Tofu",
        "name_zh": "嫩豆腐",
        "category": "Fresh",
        "origin_country": "Canada",
        "supplier_name": "Pacific Fresh Foods"
      }
    ]

---

## 2. Inventory

### GET /api/inventory

Returns inventory batch data.

#### Response

    [
      {
        "batch_id": 1,
        "batch_code": "BATCH-001",
        "quantity": 100,
        "expiry_date": "2026-05-05",
        "store_name": "Richmond Store"
      }
    ]

---

## 3. Expiring Products

### GET /api/expiring-products?days=10

Returns products expiring within X days.

#### Response

    [
      {
        "batch_id": 1,
        "name_en": "Soft Tofu",
        "days_until_expiry": 2
      }
    ]

---

## 4. Waste Analytics

### GET /api/analytics/waste-summary

Returns aggregated waste data.

#### Response

    [
      {
        "store_name": "Richmond Store",
        "category": "Fresh",
        "total_quantity_wasted": 20,
        "total_estimated_loss": 120.5
      }
    ]

---

## 5. Authentication

### POST /api/auth/login

#### Request

    {
      "username": "admin",
      "password": "abc123456"
    }

#### Response

    {
      "token": "JWT_TOKEN",
      "user": {
        "username": "admin",
        "role": "ADMIN"
      }
    }

---

## 6. Legacy Suppliers

### GET /api/legacy-suppliers

Node.js backend calls PHP service.

#### Response

    {
      "source": "legacy-php-service",
      "count": 3,
      "data": [
        {
          "legacy_supplier_id": "LEG-SUP-001",
          "name": "Pacific Fresh Foods"
        }
      ]
    }