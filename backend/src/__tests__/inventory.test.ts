import request from "supertest";
import app from "../app";

describe("Inventory API", () => {
  test("GET /api/inventory should return inventory records or database error", async () => {
    const response = await request(app).get("/api/inventory");

    expect([200, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty("batch_id");
        expect(response.body[0]).toHaveProperty("batch_code");
        expect(response.body[0]).toHaveProperty("product_id");
        expect(response.body[0]).toHaveProperty("name_en");
        expect(response.body[0]).toHaveProperty("quantity");
        expect(response.body[0]).toHaveProperty("store_id");
        expect(response.body[0]).toHaveProperty("store_name");
      }
    }

    if (response.status === 500) {
      expect(response.body).toHaveProperty("message");
    }
  });
});