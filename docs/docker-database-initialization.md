# Docker Database Initialization

## Purpose

The Smart Inventory ERP system uses Docker Compose to initialize a local MySQL database automatically for development and testing.

The database is initialized from two SQL files:

- `database/schema.sql`
- `database/seed.sql`

These files are mounted into the official MySQL container initialization directory:

- `/docker-entrypoint-initdb.d/01-schema.sql`
- `/docker-entrypoint-initdb.d/02-seed.sql`

The numeric prefixes ensure that the schema is created before seed data is inserted.

## Docker Compose Configuration

The MySQL service uses the following volume mounts:

```yaml
volumes:
  - smart_inventory_mysql_data:/var/lib/mysql
  - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
  - ./database/seed.sql:/docker-entrypoint-initdb.d/02-seed.sql:ro