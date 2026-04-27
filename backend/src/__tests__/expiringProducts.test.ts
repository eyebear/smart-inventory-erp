import request from "supertest";
import app from "../app";

describe("Expiring Products API", () => {
  test("GET /api/expiring-products should return expiring product records", async () => {
    const response = await request(app).get("/api/expiring-products");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("Expiring product should contain expiry-related fields", async () => {
    const response = await request(app).get("/api/expiring-products");

    expect(response.status).toBe(200);

    if (response.body.length > 0) {
      expect(response.body[0]).toHaveProperty("product_id");
      expect(response.body[0]).toHaveProperty("name_en");
      expect(response.body[0]).toHaveProperty("expiry_date");
      expect(response.body[0]).toHaveProperty("days_until_expiry");
      expect(response.body[0]).toHaveProperty("store_name");
      expect(response.body[0]).toHaveProperty("quantity");
    }
  });
});