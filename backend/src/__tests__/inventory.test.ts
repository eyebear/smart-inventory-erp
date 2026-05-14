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

describe("Inventory API (read)", () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
  });

  test("GET /api/inventory should reject unauthenticated requests", async () => {
    const response = await request(app).get("/api/inventory");

    expect(response.status).toBe(401);
  });

  test("GET /api/inventory should refuse a store-scoped user without a store assignment", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 5,
      username: "orphan",
      role: "STORE_MANAGER",
      store_id: null
    });

    const token = signTestToken({ userId: 5, username: "orphan" });
    const response = await request(app)
      .get("/api/inventory")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(dbQueryMock).not.toHaveBeenCalled();
  });

  test("GET /api/inventory returns 200 with rows for ADMIN", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 1,
      username: "admin",
      role: "ADMIN",
      store_id: null
    });

    const rows = [
      {
        batch_id: 10,
        batch_code: "B-1",
        quantity: 5,
        product_id: 1,
        sku: "X",
        name_en: "X",
        name_zh: "X",
        category: "X",
        store_id: 1,
        store_name: "Richmond Store",
        city: "Richmond"
      }
    ];
    dbQueryMock.mockResolvedValueOnce([rows, []]);

    const token = signTestToken({ userId: 1, username: "admin" });
    const response = await request(app)
      .get("/api/inventory")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(rows);
  });

  test("GET /api/inventory surfaces 500 on DB failure", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 1,
      username: "admin",
      role: "ADMIN",
      store_id: null
    });
    dbQueryMock.mockRejectedValueOnce(new Error("boom"));

    const token = signTestToken({ userId: 1, username: "admin" });
    const response = await request(app)
      .get("/api/inventory")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(500);
  });
});
