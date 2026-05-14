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

describe("Expiring Products API", () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
  });

  test("GET /api/expiring-products should reject unauthenticated requests", async () => {
    const response = await request(app).get("/api/expiring-products");
    expect(response.status).toBe(401);
  });

  test("GET /api/expiring-products returns 200 rows for ADMIN", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 1,
      username: "admin",
      role: "ADMIN",
      store_id: null
    });

    const rows = [
      {
        batch_id: 1,
        batch_code: "B",
        quantity: 1,
        product_id: 1,
        sku: "S",
        name_en: "Name",
        name_zh: "名",
        category: "C",
        store_id: 1,
        store_name: "Richmond Store",
        city: "Richmond",
        expiry_date: "2026-05-20",
        days_until_expiry: 6
      }
    ];
    dbQueryMock.mockResolvedValueOnce([rows, []]);

    const token = signTestToken({ userId: 1, username: "admin" });
    const response = await request(app)
      .get("/api/expiring-products?days=10")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(rows);
  });
});
