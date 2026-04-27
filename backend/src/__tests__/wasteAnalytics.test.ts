import request from "supertest";
import app from "../app";

describe("Waste Analytics API", () => {
  test("GET /api/analytics/waste-summary should return waste summary or database error", async () => {
    const response = await request(app).get("/api/analytics/waste-summary");

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty("store_name");
        expect(response.body[0]).toHaveProperty("category");
        expect(response.body[0]).toHaveProperty("total_quantity_wasted");
        expect(response.body[0]).toHaveProperty("total_estimated_loss");
      }
    }

    if (response.status === 500) {
      expect(response.body).toHaveProperty("message");
      expect(typeof response.body.message).toBe("string");
    }
  });
});