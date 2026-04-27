import request from "supertest";
import app from "../app";

describe("Legacy Suppliers API", () => {
  test("GET /api/legacy-suppliers should return supplier data or service unavailable response", async () => {
    const response = await request(app).get("/api/legacy-suppliers");

    expect([200, 502]).toContain(response.status);
  });
});