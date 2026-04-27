import request from "supertest";
import app from "../app";

describe("Inventory API", () => {
  test("GET /api/inventory should return inventory records", async () => {
    const response = await request(app).get("/api/inventory");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test("Inventory item should contain quantity and store information", async () => {
    const response = await request(app).get("/api/inventory");

    expect(response.status).toBe(200);

    if (response.body.length > 0) {
      expect(response.body[0]).toHaveProperty("batch_id");
      expect(response.body[0]).toHaveProperty("batch_code");
      expect(response.body[0]).toHaveProperty("product_id");
      expect(response.body[0]).toHaveProperty("name_en");
      expect(response.body[0]).toHaveProperty("quantity");
      expect(response.body[0]).toHaveProperty("store_id");
      expect(response.body[0]).toHaveProperty("store_name");
    }
  });
});