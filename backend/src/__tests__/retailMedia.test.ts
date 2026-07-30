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
    execute: jest.fn(),
    getConnection: jest.fn()
  }
}));

import app from "../app";
import { db } from "../config/database";
import { findActiveUserById } from "../services/authService";
import { signTestToken } from "./testHelpers";

const dbQueryMock = db.query as jest.Mock;
const findActiveUserByIdMock = findActiveUserById as jest.MockedFunction<
  typeof findActiveUserById
>;

describe("Retail Media API", () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
  });

  test("GET /api/retail-media/campaigns requires authentication", async () => {
    const response = await request(app).get("/api/retail-media/campaigns");
    expect(response.status).toBe(401);
  });

  test("GET /api/retail-media/performance returns KPI rows", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 1,
      username: "admin",
      role: "ADMIN",
      store_id: null
    });
    const rows = [{ campaign_code: "CMP-1", impressions: "100", ctr: "0.05" }];
    dbQueryMock.mockResolvedValueOnce([rows, []]);

    const response = await request(app)
      .get("/api/retail-media/performance")
      .set("Authorization", `Bearer ${signTestToken({ userId: 1, username: "admin" })}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(rows);
    expect(String(dbQueryMock.mock.calls[0][0])).toMatch(/NULLIF\(SUM\(e\.impressions\)/);
  });
});
