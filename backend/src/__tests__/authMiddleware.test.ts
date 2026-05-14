import request from "supertest";
import jwt from "jsonwebtoken";

jest.mock("../services/authService", () => ({
  __esModule: true,
  validateUser: jest.fn(),
  findActiveUserById: jest.fn()
}));

import app from "../app";
import { findActiveUserById } from "../services/authService";
import { signTestToken } from "./testHelpers";

const findActiveUserByIdMock = findActiveUserById as jest.MockedFunction<
  typeof findActiveUserById
>;

describe("Auth middleware enforcement", () => {
  test("GET /api/auth/me without Authorization header returns 401", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message");
    expect(findActiveUserByIdMock).not.toHaveBeenCalled();
  });

  test("GET /api/auth/me with malformed header returns 401", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Token abc");

    expect(response.status).toBe(401);
  });

  test("GET /api/auth/me with invalid token returns 401", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/invalid|expired/i);
  });

  test("GET /api/auth/me with HS256-signed token is rejected (algorithm pinned to RS256)", async () => {
    const hsToken = jwt.sign({ sub: "1", username: "alice" }, "shared-secret", {
      algorithm: "HS256",
      issuer: "smart-inventory-erp",
      audience: "smart-inventory-erp-clients"
    });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${hsToken}`);

    expect(response.status).toBe(401);
  });

  test("GET /api/auth/me with expired RS256 token returns 401", async () => {
    const expiredToken = signTestToken({
      userId: 1,
      username: "alice",
      expiresIn: "-1s"
    });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
  });

  test("GET /api/auth/me denies deactivated/missing user (DB recheck)", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce(null);

    const token = signTestToken({ userId: 99, username: "ghost" });
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/no longer active|invalid/i);
    expect(findActiveUserByIdMock).toHaveBeenCalledWith(99);
  });

  test("GET /api/auth/me returns DB-authoritative role and store, not JWT claims", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 42,
      username: "alice_db",
      role: "MANAGER",
      store_id: 7
    });

    const token = signTestToken({
      userId: 42,
      username: "alice_stale_claim"
    });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        id: 42,
        username: "alice_db",
        role: "MANAGER",
        store_id: 7
      }
    });
  });
});
