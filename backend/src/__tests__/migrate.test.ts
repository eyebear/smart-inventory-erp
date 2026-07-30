jest.mock("../config/database", () => ({
  __esModule: true,
  db: {
    query: jest.fn(),
    getConnection: jest.fn()
  }
}));

import { db } from "../config/database";
import { runMigrations } from "../config/migrate";

const dbQueryMock = db.query as jest.Mock;

describe("runMigrations()", () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
  });

  test("adds missing users columns and creates auth_audit_log", async () => {
    // is_active check → missing
    dbQueryMock.mockResolvedValueOnce([[{ count: 0 }], []]);
    // ALTER add is_active
    dbQueryMock.mockResolvedValueOnce([{ affectedRows: 0 }, []]);
    // updated_at check → missing
    dbQueryMock.mockResolvedValueOnce([[{ count: 0 }], []]);
    // ALTER add updated_at
    dbQueryMock.mockResolvedValueOnce([{ affectedRows: 0 }, []]);
    // CREATE TABLE IF NOT EXISTS auth_audit_log and retail-media tables
    for (let i = 0; i < 10; i += 1) {
      dbQueryMock.mockResolvedValueOnce([{ affectedRows: 0 }, []]);
    }

    await runMigrations();

    expect(dbQueryMock).toHaveBeenCalledTimes(14);
    const sqls = dbQueryMock.mock.calls.map((c) => String(c[0]).trim());

    expect(sqls[0]).toMatch(/information_schema\.columns/i);
    expect(sqls[1]).toMatch(/ALTER TABLE users\s+ADD COLUMN is_active/);
    expect(sqls[3]).toMatch(/ALTER TABLE users\s+ADD COLUMN updated_at/);
    expect(sqls[4]).toMatch(/CREATE TABLE IF NOT EXISTS auth_audit_log/);
    expect(sqls.some((sql) => /CREATE TABLE IF NOT EXISTS campaigns/.test(sql))).toBe(true);
    expect(sqls.some((sql) => /CREATE TABLE IF NOT EXISTS campaign_daily_events/.test(sql))).toBe(true);
  });

  test("skips ALTER when users columns already exist", async () => {
    dbQueryMock.mockResolvedValueOnce([[{ count: 1 }], []]); // is_active present
    dbQueryMock.mockResolvedValueOnce([[{ count: 1 }], []]); // updated_at present
    for (let i = 0; i < 10; i += 1) {
      dbQueryMock.mockResolvedValueOnce([{ affectedRows: 0 }, []]);
    }

    await runMigrations();

    expect(dbQueryMock).toHaveBeenCalledTimes(12);
    const sqls = dbQueryMock.mock.calls.map((c) => String(c[0]).trim());
    expect(sqls.some((s) => /ALTER TABLE users/.test(s))).toBe(false);
    expect(sqls[2]).toMatch(/CREATE TABLE IF NOT EXISTS auth_audit_log/);
  });
});
