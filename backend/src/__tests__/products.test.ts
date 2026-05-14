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
import { signTestToken } from "./testHelpers";

const findActiveUserByIdMock = findActiveUserById as jest.MockedFunction<
  typeof findActiveUserById
>;
const dbQueryMock = db.query as jest.Mock;

describe("Products API", () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
  });

  function controllerQueryCalls() {
    return dbQueryMock.mock.calls.filter(
      (call) => !String(call[0]).includes("auth_audit_log")
    );
  }

  test("GET /api/products should reject unauthenticated requests", async () => {
    const response = await request(app).get("/api/products");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message");
    expect(controllerQueryCalls()).toHaveLength(0);
  });

  test("GET /api/products should reject invalid tokens", async () => {
    const response = await request(app)
      .get("/api/products")
      .set("Authorization", "Bearer not-a-real-token");

    expect(response.status).toBe(401);
    expect(controllerQueryCalls()).toHaveLength(0);
  });

  test("GET /api/products returns 200 with rows for ADMIN", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 1,
      username: "admin",
      role: "ADMIN",
      store_id: null
    });

    const fakeRows = [
      {
        id: 1,
        sku: "TOFU-001",
        name_en: "Soft Tofu",
        name_zh: "嫩豆腐",
        category: "Fresh Food",
        origin_country: "Canada",
        supplier_name: "Pacific Fresh Foods"
      }
    ];
    dbQueryMock.mockResolvedValueOnce([fakeRows, []]);

    const token = signTestToken({ userId: 1, username: "admin" });
    const response = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fakeRows);
  });

  test("GET /api/products surfaces 500 if DB query fails", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 1,
      username: "admin",
      role: "ADMIN",
      store_id: null
    });
    dbQueryMock.mockRejectedValueOnce(new Error("boom"));

    const token = signTestToken({ userId: 1, username: "admin" });
    const response = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(500);
    expect(response.body.message).toMatch(/failed to fetch products/i);
  });
});
