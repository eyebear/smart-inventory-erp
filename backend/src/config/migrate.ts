import { RowDataPacket } from "mysql2";
import { db } from "./database";

type CountRow = RowDataPacket & { count: number };

async function columnExists(table: string, column: string): Promise<boolean> {
  const [rows] = await db.query<CountRow[]>(
    `
    SELECT COUNT(*) AS count
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
    `,
    [table, column]
  );
  return rows.length > 0 && rows[0].count > 0;
}

async function ensureUsersColumns(): Promise<void> {
  if (!(await columnExists("users", "is_active"))) {
    await db.query(
      `ALTER TABLE users
       ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`
    );
    console.log("[migrate] users.is_active added");
  }

  if (!(await columnExists("users", "updated_at"))) {
    await db.query(
      `ALTER TABLE users
       ADD COLUMN updated_at TIMESTAMP
         NOT NULL DEFAULT CURRENT_TIMESTAMP
         ON UPDATE CURRENT_TIMESTAMP`
    );
    console.log("[migrate] users.updated_at added");
  }
}

async function ensureAuthAuditLog(): Promise<void> {
  await db.query(
    `
    CREATE TABLE IF NOT EXISTS auth_audit_log (
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
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `
  );
  console.log("[migrate] auth_audit_log ready");
}

export async function runMigrations(): Promise<void> {
  // schema.sql in docker-entrypoint-initdb.d only runs on a fresh MySQL data
  // volume. We bring the live schema up to the application's expectations on
  // every backend boot so existing volumes don't break after upgrades.
  await ensureUsersColumns();
  await ensureAuthAuditLog();
}
