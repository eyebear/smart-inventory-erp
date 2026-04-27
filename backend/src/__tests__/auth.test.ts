import request from "supertest";
import app from "../app";

describe("Auth API", () => {
  test("POST /api/auth/login should reject missing credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({});

    expect([400, 401]).toContain(response.status);
  });

  test("POST /api/auth/login should reject invalid credentials or database error", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        username: "wrong_user",
        password: "wrong_password"
      });

    expect([400, 401, 500]).toContain(response.status);

    if (response.status === 500) {
      expect(response.body).toHaveProperty("message");
      expect(typeof response.body.message).toBe("string");
    }
  });
});