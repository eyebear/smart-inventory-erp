import request from "supertest";

jest.mock("../services/authService", () => ({
  __esModule: true,
  validateUser: jest.fn(),
  findActiveUserById: jest.fn()
}));

jest.mock("../config/database", () => ({
  __esModule: true,
  db: {
    query: jest.fn(),
    getConnection: jest.fn()
  }
}));

import app from "../app";
import { db } from "../config/database";
import { findActiveUserById } from "../services/authService";
import { logAuthEvent } from "../services/authAudit";
import { signTestToken } from "./testHelpers";

const findActiveUserByIdMock = findActiveUserById as jest.MockedFunction<
  typeof findActiveUserById
>;
const dbQueryMock = db.query as jest.Mock;

describe("Audit log endpoint", () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
  });

  test("GET /api/audit-log requires authentication", async () => {
    const response = await request(app).get("/api/audit-log");
    expect(response.status).toBe(401);
  });

  test("GET /api/audit-log forbids non-ADMIN users and writes a DENY audit record", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 2,
      username: "richmond_manager",
      role: "STORE_MANAGER",
      store_id: 1
    });

    dbQueryMock.mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, []]);

    const token = signTestToken({ userId: 2, username: "richmond_manager" });
    const response = await request(app)
      .get("/api/audit-log")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);

    const auditCall = dbQueryMock.mock.calls.find((c) =>
      String(c[0]).includes("auth_audit_log")
    );
    expect(auditCall).toBeDefined();
    expect(auditCall![1][2]).toBe("AUTHZ_ROLE_FORBIDDEN");
  });

  test("GET /api/audit-log returns rows for ADMIN and audits the view", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 1,
      username: "admin",
      role: "ADMIN",
      store_id: null
    });

    const fakeRows = [
      {
        id: 1,
        user_id: 1,
        username: "admin",
        action: "LOGIN_SUCCESS",
        resource: null,
        outcome: "SUCCESS",
        ip_address: "127.0.0.1",
        user_agent: "jest",
        message: null,
        metadata: null,
        created_at: "2026-05-14T03:00:00Z"
      }
    ];

    dbQueryMock
      .mockResolvedValueOnce([fakeRows, []])
      .mockResolvedValueOnce([{ insertId: 99, affectedRows: 1 }, []]);

    const token = signTestToken({ userId: 1, username: "admin" });
    const response = await request(app)
      .get("/api/audit-log?limit=50")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fakeRows);

    const selectCall = dbQueryMock.mock.calls[0];
    expect(selectCall[0]).toMatch(/FROM auth_audit_log/i);
    expect(selectCall[1]).toEqual([50]);

    const auditCall = dbQueryMock.mock.calls.find((c) =>
      String(c[0]).includes("INSERT INTO auth_audit_log")
    );
    expect(auditCall).toBeDefined();
    expect(auditCall![1][2]).toBe("AUDIT_LOG_VIEW");
  });
});

describe("logAuthEvent service", () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
  });

  test("inserts the canonical 9-column payload", async () => {
    dbQueryMock.mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, []]);

    await logAuthEvent({
      action: "LOGIN_SUCCESS",
      outcome: "SUCCESS",
      userId: 7,
      username: "alice",
      resource: "POST /api/auth/login",
      ipAddress: "1.2.3.4",
      userAgent: "jest",
      message: "ok",
      metadata: { role: "ADMIN" }
    });

    expect(dbQueryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = dbQueryMock.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO auth_audit_log/);
    expect(params).toEqual([
      7,
      "alice",
      "LOGIN_SUCCESS",
      "POST /api/auth/login",
      "SUCCESS",
      "1.2.3.4",
      "jest",
      "ok",
      JSON.stringify({ role: "ADMIN" })
    ]);
  });

  test("swallows DB errors so audit failures cannot break the request path", async () => {
    dbQueryMock.mockRejectedValueOnce(new Error("audit table down"));

    await expect(
      logAuthEvent({
        action: "LOGIN_FAILURE",
        outcome: "DENY",
        username: "ghost"
      })
    ).resolves.toBeUndefined();
  });
});
