SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS smart_inventory_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smart_inventory_erp;

CREATE TABLE stores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  country VARCHAR(100),
  contact_email VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(50) NOT NULL UNIQUE,
  name_en VARCHAR(150) NOT NULL,
  name_zh VARCHAR(150),
  category VARCHAR(100) NOT NULL,
  origin_country VARCHAR(100),
  supplier_id INT,
  unit_cost DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE inventory_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  store_id INT NOT NULL,
  batch_code VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  expiry_date DATE,
  received_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (store_id) REFERENCES stores(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE inventory_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  movement_type VARCHAR(50) NOT NULL,
  quantity_change INT NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES inventory_batches(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE waste_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  quantity_wasted INT NOT NULL,
  waste_reason VARCHAR(100) NOT NULL,
  waste_date DATE NOT NULL,
  estimated_loss DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES inventory_batches(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  store_id INT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE auth_audit_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  username VARCHAR(100),
  action VARCHAR(64) NOT NULL,
  resource VARCHAR(255),
  outcome ENUM('SUCCESS', 'DENY', 'ERROR') NOT NULL,
  ip_address VARCHAR(64),
  user_agent VARCHAR(255),
  message VARCHAR(500),
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_outcome (outcome),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Retail-media operational module. These tables extend the ERP with campaigns
-- that promote products already managed by the inventory system.
CREATE TABLE advertisers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  industry VARCHAR(100),
  contact_email VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_advertiser_name (name)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE audience_segments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_audience_segment_name (name)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE campaigns (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  campaign_code VARCHAR(80) NOT NULL,
  advertiser_id BIGINT NOT NULL,
  store_id INT NULL,
  region VARCHAR(100),
  channel VARCHAR(50) NOT NULL,
  audience_segment_id BIGINT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  planned_budget DECIMAL(14, 2) NOT NULL,
  daily_budget DECIMAL(14, 2) NOT NULL,
  objective VARCHAR(80) NOT NULL,
  status VARCHAR(30) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_campaign_code (campaign_code),
  INDEX idx_campaign_dates (start_date, end_date),
  INDEX idx_campaign_status (status),
  FOREIGN KEY (advertiser_id) REFERENCES advertisers(id),
  FOREIGN KEY (store_id) REFERENCES stores(id),
  FOREIGN KEY (audience_segment_id) REFERENCES audience_segments(id),
  CHECK (end_date >= start_date),
  CHECK (planned_budget >= 0),
  CHECK (daily_budget >= 0)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE campaign_products (
  campaign_id BIGINT NOT NULL,
  product_id INT NOT NULL,
  promoted_sku VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (campaign_id, product_id),
  INDEX idx_campaign_product_sku (promoted_sku),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE campaign_budgets (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  campaign_id BIGINT NOT NULL,
  budget_date DATE NOT NULL,
  planned_daily_budget DECIMAL(14, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_campaign_budget_date (campaign_id, budget_date),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CHECK (planned_daily_budget >= 0)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE campaign_daily_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(100) NOT NULL,
  event_date DATE NOT NULL,
  campaign_id BIGINT NULL,
  product_id INT NULL,
  store_id INT NULL,
  audience_segment_id BIGINT NULL,
  region VARCHAR(100),
  channel VARCHAR(50) NOT NULL,
  device VARCHAR(50) NOT NULL,
  impressions BIGINT NOT NULL,
  clicks BIGINT NOT NULL,
  conversions BIGINT NOT NULL,
  spend DECIMAL(16, 4) NOT NULL,
  attributed_revenue DECIMAL(16, 4) NOT NULL,
  ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_campaign_event_id (event_id),
  INDEX idx_campaign_events_date (event_date),
  INDEX idx_campaign_events_campaign_date (campaign_id, event_date),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL,
  FOREIGN KEY (audience_segment_id) REFERENCES audience_segments(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE campaign_conversions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  conversion_id VARCHAR(100) NOT NULL,
  campaign_id BIGINT NULL,
  event_date DATE NOT NULL,
  product_id INT NULL,
  store_id INT NULL,
  conversion_type VARCHAR(50) NOT NULL,
  conversion_value DECIMAL(16, 4) NOT NULL,
  attributed_revenue DECIMAL(16, 4) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_conversion_id (conversion_id),
  INDEX idx_conversion_campaign_date (campaign_id, event_date),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE analytics_pipeline_runs (
  run_id VARCHAR(250) PRIMARY KEY,
  dag_id VARCHAR(150) NOT NULL,
  business_date DATE NOT NULL,
  environment VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL,
  rows_processed BIGINT NOT NULL DEFAULT 0,
  error_message VARCHAR(1000),
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pipeline_run_date (business_date),
  INDEX idx_pipeline_run_status (status)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE analytics_alerts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  alert_key VARCHAR(300) NOT NULL,
  alert_class ENUM('TECHNICAL', 'BUSINESS') NOT NULL,
  alert_type VARCHAR(100) NOT NULL,
  severity ENUM('INFO', 'WARNING', 'HIGH', 'CRITICAL') NOT NULL,
  status ENUM('OPEN', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
  message VARCHAR(1000) NOT NULL,
  source_run_id VARCHAR(250),
  details JSON,
  opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  UNIQUE KEY uq_analytics_alert_key (alert_key),
  INDEX idx_analytics_alert_status (status),
  INDEX idx_analytics_alert_type (alert_type),
  INDEX idx_analytics_alert_last_seen (last_seen_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
