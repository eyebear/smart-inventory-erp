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
import { validateUser } from "../services/authService";

const validateUserMock = validateUser as jest.MockedFunction<typeof validateUser>;

describe("Auth API", () => {
  beforeEach(() => {
    validateUserMock.mockReset();
  });

  test("POST /api/auth/login rejects missing credentials with 400", async () => {
    const response = await request(app).post("/api/auth/login").send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/required/i);
    expect(validateUserMock).not.toHaveBeenCalled();
  });

  test("POST /api/auth/login rejects invalid credentials with 401", async () => {
    validateUserMock.mockResolvedValueOnce(null);

    const response = await request(app).post("/api/auth/login").send({
      username: "wrong_user",
      password: "wrong_password"
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/invalid/i);
  });

  test("POST /api/auth/login issues an RS256 token on success", async () => {
    validateUserMock.mockResolvedValueOnce({
      id: 1,
      username: "admin",
      role: "ADMIN",
      store_id: null
    });

    const response = await request(app).post("/api/auth/login").send({
      username: "admin",
      password: "abc123456"
    });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe("string");
    expect(response.body.token.split(".")).toHaveLength(3);
    expect(response.body.user).toEqual({
      id: 1,
      username: "admin",
      role: "ADMIN",
      store_id: null
    });

    const headerB64 = response.body.token.split(".")[0];
    const header = JSON.parse(
      Buffer.from(headerB64, "base64url").toString("utf8")
    );
    expect(header.alg).toBe("RS256");
  });
});
