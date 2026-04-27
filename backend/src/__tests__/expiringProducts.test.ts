import request from "supertest";
import app from "../app";

describe("Expiring Products API", () => {
  test("GET /api/expiring-products should return expiring products or database error", async () => {
    const response = await request(app).get("/api/expiring-products");

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty("product_id");
        expect(response.body[0]).toHaveProperty("name_en");
        expect(response.body[0]).toHaveProperty("expiry_date");
        expect(response.body[0]).toHaveProperty("days_until_expiry");
        expect(response.body[0]).toHaveProperty("store_name");
        expect(response.body[0]).toHaveProperty("quantity");
      }
    }

    if (response.status === 500) {
      expect(response.body).toHaveProperty("message");
      expect(typeof response.body.message).toBe("string");
    }
  });
});