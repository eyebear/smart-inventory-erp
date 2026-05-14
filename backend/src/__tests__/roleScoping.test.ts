import request from "supertest";

jest.mock("../services/authService", () => ({
  __esModule: true,
  validateUser: jest.fn(),
  findActiveUserById: jest.fn()
}));

jest.mock("../config/database", () => ({
  __esModule: true,
  db: {
    query: jest.fn()
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

function asAdmin() {
  findActiveUserByIdMock.mockResolvedValueOnce({
    id: 1,
    username: "admin",
    role: "ADMIN",
    store_id: null
  });
  return signTestToken({ userId: 1, username: "admin" });
}

function asRichmondManager() {
  findActiveUserByIdMock.mockResolvedValueOnce({
    id: 2,
    username: "richmond_manager",
    role: "STORE_MANAGER",
    store_id: 1
  });
  return signTestToken({ userId: 2, username: "richmond_manager" });
}

function hasStoreFilter(sql: string): boolean {
  return /WHERE[^;]*ib\.store_id\s*=\s*\?/i.test(sql) ||
    /AND[^;]*ib\.store_id\s*=\s*\?/i.test(sql);
}

describe("Role-based store scoping", () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
  });

  describe("GET /api/inventory", () => {
    test("ADMIN issues an unfiltered query (no store param)", async () => {
      dbQueryMock.mockResolvedValueOnce([[], []]);
      const token = asAdmin();

      const response = await request(app)
        .get("/api/inventory")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      const [sql, params] = dbQueryMock.mock.calls[0];
      expect(hasStoreFilter(sql)).toBe(false);
      expect(params).toBeUndefined();
    });

    test("STORE_MANAGER query is scoped to their store_id", async () => {
      dbQueryMock.mockResolvedValueOnce([[], []]);
      const token = asRichmondManager();

      const response = await request(app)
        .get("/api/inventory")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      const [sql, params] = dbQueryMock.mock.calls[0];
      expect(hasStoreFilter(sql)).toBe(true);
      expect(params).toEqual([1]);
    });
  });

  describe("GET /api/expiring-products", () => {
    test("STORE_MANAGER query is scoped to their store_id, ADMIN is not", async () => {
      dbQueryMock.mockResolvedValueOnce([[], []]);
      let token = asRichmondManager();

      let response = await request(app)
        .get("/api/expiring-products?days=5")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      let call = dbQueryMock.mock.calls[0];
      expect(hasStoreFilter(call[0])).toBe(true);
      expect(call[1]).toEqual([5, 1]);

      dbQueryMock.mockReset();
      dbQueryMock.mockResolvedValueOnce([[], []]);
      token = asAdmin();

      response = await request(app)
        .get("/api/expiring-products?days=5")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      call = dbQueryMock.mock.calls[0];
      expect(hasStoreFilter(call[0])).toBe(false);
      expect(call[1]).toEqual([5]);
    });
  });

  describe("GET /api/analytics/waste-summary", () => {
    test("ADMIN sees all stores (no store filter param)", async () => {
      dbQueryMock.mockResolvedValueOnce([[], []]);
      const token = asAdmin();

      const response = await request(app)
        .get("/api/analytics/waste-summary")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      const [sql, params] = dbQueryMock.mock.calls[0];
      expect(hasStoreFilter(sql)).toBe(false);
      expect(params).toBeUndefined();
    });

    test("STORE_MANAGER aggregate is filtered to their store", async () => {
      dbQueryMock.mockResolvedValueOnce([[], []]);
      const token = asRichmondManager();

      const response = await request(app)
        .get("/api/analytics/waste-summary")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      const [sql, params] = dbQueryMock.mock.calls[0];
      expect(hasStoreFilter(sql)).toBe(true);
      expect(params).toEqual([1]);
    });
  });

  describe("GET /api/products", () => {
    test("STORE_MANAGER only sees products with batches in their store", async () => {
      dbQueryMock.mockResolvedValueOnce([[], []]);
      const token = asRichmondManager();

      const response = await request(app)
        .get("/api/products")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      const [sql, params] = dbQueryMock.mock.calls[0];
      expect(sql).toMatch(/INNER JOIN inventory_batches/i);
      expect(hasStoreFilter(sql)).toBe(true);
      expect(params).toEqual([1]);
    });

    test("ADMIN gets the full products list with no store join filter", async () => {
      dbQueryMock.mockResolvedValueOnce([[], []]);
      const token = asAdmin();

      const response = await request(app)
        .get("/api/products")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      const [sql, params] = dbQueryMock.mock.calls[0];
      expect(sql).not.toMatch(/INNER JOIN inventory_batches/i);
      expect(params).toBeUndefined();
    });
  });
});
