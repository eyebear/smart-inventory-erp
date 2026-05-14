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

describe("Waste Analytics API", () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
  });

  test("GET /api/analytics/waste-summary should reject unauthenticated requests", async () => {
    const response = await request(app).get("/api/analytics/waste-summary");
    expect(response.status).toBe(401);
  });

  test("GET /api/analytics/waste-summary returns 200 rows for ADMIN", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 1,
      username: "admin",
      role: "ADMIN",
      store_id: null
    });

    const rows = [
      {
        store_name: "Richmond Store",
        category: "Seafood",
        total_quantity_wasted: "3",
        total_estimated_loss: "36.00"
      }
    ];
    dbQueryMock.mockResolvedValueOnce([rows, []]);

    const token = signTestToken({ userId: 1, username: "admin" });
    const response = await request(app)
      .get("/api/analytics/waste-summary")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(rows);
  });
});
