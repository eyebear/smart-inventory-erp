# Database Design

## Purpose

The database supports a multi-store inventory and waste reduction system for retail grocery operations.

The design focuses on:

- Product management
- Supplier tracking
- Multi-store inventory
- Batch-level expiry tracking
- Inventory movement history
- Waste tracking
- Role-based users

## Main Tables

### stores

Represents physical store locations.

### suppliers

Represents product suppliers and import partners.

### products

Stores product master data, including English and Chinese names, category, origin country, supplier, and unit cost.

### inventory_batches

Tracks product inventory at the batch level.

This is important because grocery products often have different expiry dates even if they are the same product.

### inventory_movements

Tracks inventory changes such as receiving, sale, adjustment, transfer, or waste.

### waste_records

Tracks discarded or expired inventory and estimated financial loss.

### users

Stores system users and their roles.

## Key Business Logic Supported

### Expiry Alert

The system can find inventory batches where:

```sql
expiry_date <= CURRENT_DATE + INTERVAL 3 DAY