import request from "supertest";
import app from "../app";

describe("Products API", () => {
  test("GET /api/products should return a product list", async () => {
    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("Each product should contain core product fields", async () => {
    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);

    if (response.body.length > 0) {
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("sku");
      expect(response.body[0]).toHaveProperty("name_en");
      expect(response.body[0]).toHaveProperty("name_zh");
      expect(response.body[0]).toHaveProperty("category");
    }
  });
});