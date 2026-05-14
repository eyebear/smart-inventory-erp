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

describe("Stores API", () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
  });

  test("rejects unauthenticated requests", async () => {
    const response = await request(app).get("/api/stores");
    expect(response.status).toBe(401);
  });

  test("ADMIN sees all stores (no filter)", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 1,
      username: "admin",
      role: "ADMIN",
      store_id: null
    });

    const rows = [
      { id: 1, name: "Richmond", city: "Richmond", address: "x" },
      { id: 2, name: "Burnaby", city: "Burnaby", address: "y" }
    ];
    dbQueryMock.mockResolvedValueOnce([rows, []]);

    const token = signTestToken({ userId: 1, username: "admin" });
    const response = await request(app)
      .get("/api/stores")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(rows);
    const [sql, params] = dbQueryMock.mock.calls[0];
    expect(sql).not.toMatch(/WHERE/i);
    expect(params).toBeUndefined();
  });

  test("STORE_MANAGER sees only their own store", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 2,
      username: "richmond_manager",
      role: "STORE_MANAGER",
      store_id: 1
    });

    const rows = [{ id: 1, name: "Richmond", city: "Richmond", address: "x" }];
    dbQueryMock.mockResolvedValueOnce([rows, []]);

    const token = signTestToken({ userId: 2, username: "richmond_manager" });
    const response = await request(app)
      .get("/api/stores")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(rows);
    const [sql, params] = dbQueryMock.mock.calls[0];
    expect(sql).toMatch(/WHERE id\s*=\s*\?/i);
    expect(params).toEqual([1]);
  });
});
