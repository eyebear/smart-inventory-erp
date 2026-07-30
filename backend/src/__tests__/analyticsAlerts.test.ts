import request from "supertest";

jest.mock("../services/authService", () => ({
  __esModule: true,
  validateUser: jest.fn(),
  findActiveUserById: jest.fn()
}));
jest.mock("../config/database", () => ({
  __esModule: true,
  db: { query: jest.fn(), getConnection: jest.fn() }
}));

import app from "../app";
import { db } from "../config/database";
import { findActiveUserById } from "../services/authService";
import { signTestToken } from "./testHelpers";

const query = db.query as jest.Mock;
const findUser = findActiveUserById as jest.MockedFunction<typeof findActiveUserById>;

test("GET /api/analytics/alerts returns persisted alerts", async () => {
  findUser.mockResolvedValueOnce({ id: 1, username: "admin", role: "ADMIN", store_id: null });
  query.mockResolvedValueOnce([[{ alert_type: "AIRFLOW_TASK_FAILURE", status: "OPEN" }], []]);
  const response = await request(app)
    .get("/api/analytics/alerts")
    .set("Authorization", `Bearer ${signTestToken({ userId: 1, username: "admin" })}`);
  expect(response.status).toBe(200);
  expect(response.body[0].alert_type).toBe("AIRFLOW_TASK_FAILURE");
});
