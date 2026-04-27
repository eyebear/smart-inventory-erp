import request from "supertest";
import app from "../app";

describe("Waste Analytics API", () => {
  test("GET /api/analytics/waste-summary should return waste analytics summary", async () => {
    const response = await request(app).get("/api/analytics/waste-summary");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("Waste summary item should contain waste metrics", async () => {
    const response = await request(app).get("/api/analytics/waste-summary");

    expect(response.status).toBe(200);

    if (response.body.length > 0) {
      expect(response.body[0]).toHaveProperty("store_name");
      expect(response.body[0]).toHaveProperty("category");
      expect(response.body[0]).toHaveProperty("total_quantity_wasted");
      expect(response.body[0]).toHaveProperty("total_estimated_loss");
    }
  });
});