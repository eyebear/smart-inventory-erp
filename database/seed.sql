SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

USE smart_inventory_erp;

INSERT INTO stores (name, city, address)
VALUES
  ('Richmond Store', 'Richmond', 'Example Address 1'),
  ('Burnaby Store', 'Burnaby', 'Example Address 2');

INSERT INTO suppliers (name, country, contact_email)
VALUES
  ('Pacific Fresh Foods', 'Canada', 'contact@pacificfresh.example'),
  ('East Asia Imports', 'Japan', 'contact@eastasia.example'),
  ('K-Food Distribution', 'South Korea', 'contact@kfood.example');

INSERT INTO products (sku, name_en, name_zh, category, origin_country, supplier_id, unit_cost)
VALUES
  ('TOFU-001', 'Soft Tofu', '嫩豆腐', 'Fresh Food', 'Canada', 1, 2.50),
  ('SEA-001', 'Fresh Salmon Fillet', '三文鱼片', 'Seafood', 'Canada', 1, 12.00),
  ('SNK-001', 'Rice Crackers', '米饼', 'Snack', 'Japan', 2, 3.20),
  ('KIM-001', 'Kimchi', '泡菜', 'Fresh Food', 'South Korea', 3, 5.50);

INSERT INTO inventory_batches (product_id, store_id, batch_code, quantity, expiry_date, received_date)
VALUES
  (1, 1, 'BATCH-TOFU-RICH-001', 100, '2026-05-01', '2026-04-24'),
  (2, 1, 'BATCH-SEA-RICH-001', 40, '2026-04-28', '2026-04-24'),
  (3, 1, 'BATCH-SNK-RICH-001', 200, '2026-12-31', '2026-04-20'),
  (4, 2, 'BATCH-KIM-BURN-001', 80, '2026-05-05', '2026-04-24');

INSERT INTO inventory_movements (batch_id, movement_type, quantity_change, reason)
VALUES
  (1, 'RECEIVED', 100, 'Initial stock received'),
  (2, 'RECEIVED', 40, 'Initial stock received'),
  (3, 'RECEIVED', 200, 'Initial stock received'),
  (4, 'RECEIVED', 80, 'Initial stock received');

INSERT INTO waste_records (batch_id, quantity_wasted, waste_reason, waste_date, estimated_loss)
VALUES
  (2, 3, 'Expired before sale', '2026-04-29', 36.00),
  (1, 5, 'Damaged packaging', '2026-04-26', 12.50);

INSERT INTO users (username, password_hash, role, store_id, is_active)
VALUES
  ('admin', '$2b$10$pSIA9IeGWGWCr6EKYRQZsOsMj.WEYSfX9mEpEnYm0cNJFIDDlly2u', 'ADMIN', NULL, 1),
  ('richmond_manager', '$2b$10$pSIA9IeGWGWCr6EKYRQZsOsMj.WEYSfX9mEpEnYm0cNJFIDDlly2u', 'STORE_MANAGER', 1, 1),
  ('burnaby_manager', '$2b$10$pSIA9IeGWGWCr6EKYRQZsOsMj.WEYSfX9mEpEnYm0cNJFIDDlly2u', 'STORE_MANAGER', 2, 1);