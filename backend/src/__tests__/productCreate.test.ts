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
import { db } from "../config/database";
import { findActiveUserById } from "../services/authService";
import { signTestToken } from "./testHelpers";

const findActiveUserByIdMock = findActiveUserById as jest.MockedFunction<
  typeof findActiveUserById
>;
const dbQueryMock = db.query as jest.Mock;
const dbGetConnectionMock = db.getConnection as jest.Mock;

function makeConnection() {
  const query = jest.fn();
  const release = jest.fn();
  return { query, release };
}

function asAdmin() {
  findActiveUserByIdMock.mockResolvedValueOnce({
    id: 1,
    username: "admin",
    role: "ADMIN",
    store_id: null
  });
  return signTestToken({ userId: 1, username: "admin" });
}

const validProduct = {
  sku: "PRD-NEW-001",
  name_en: "New Product",
  name_zh: "新产品",
  category: "Snack",
  origin_country: "Canada",
  supplier_id: 1,
  unit_cost: 4.25
};

describe("POST /api/products", () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
    dbGetConnectionMock.mockReset();
  });

  test("requires authentication", async () => {
    const response = await request(app).post("/api/products").send(validProduct);
    expect(response.status).toBe(401);
    expect(dbGetConnectionMock).not.toHaveBeenCalled();
  });

  test("rejects missing required fields with 400", async () => {
    const token = asAdmin();
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name_en: "x", category: "y", unit_cost: 1 });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/sku is required/i);
    expect(dbGetConnectionMock).not.toHaveBeenCalled();
  });

  test("creates a product and audits PRODUCT_CREATE", async () => {
    const connection = makeConnection();
    connection.query
      .mockResolvedValueOnce([[{ id: 1 }], []]) // supplier check
      .mockResolvedValueOnce([{ insertId: 50, affectedRows: 1 }, []]); // products insert
    dbGetConnectionMock.mockResolvedValueOnce(connection);
    dbQueryMock.mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, []]); // audit

    const token = asAdmin();
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(validProduct);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: 50,
      sku: validProduct.sku,
      name_en: validProduct.name_en
    });
    expect(connection.release).toHaveBeenCalledTimes(1);

    const auditCall = dbQueryMock.mock.calls.find((c) =>
      String(c[0]).includes("auth_audit_log")
    );
    expect(auditCall).toBeDefined();
    expect(auditCall![1][2]).toBe("PRODUCT_CREATE");
    expect(auditCall![1][4]).toBe("SUCCESS");
  });

  test("duplicate SKU returns 409", async () => {
    const connection = makeConnection();
    const dupError: Error & { code: string } = Object.assign(
      new Error("duplicate"),
      { code: "ER_DUP_ENTRY" }
    );
    connection.query
      .mockResolvedValueOnce([[{ id: 1 }], []]) // supplier check
      .mockRejectedValueOnce(dupError); // products insert dup
    dbGetConnectionMock.mockResolvedValueOnce(connection);

    const token = asAdmin();
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(validProduct);

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/already exists/i);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test("unknown supplier_id returns 400", async () => {
    const connection = makeConnection();
    connection.query.mockResolvedValueOnce([[], []]); // supplier check empty
    dbGetConnectionMock.mockResolvedValueOnce(connection);

    const token = asAdmin();
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send(validProduct);

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/unknown supplier_id/i);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test("supplier_id null is allowed and skips supplier lookup", async () => {
    const connection = makeConnection();
    connection.query.mockResolvedValueOnce([
      { insertId: 51, affectedRows: 1 },
      []
    ]); // only the products insert
    dbGetConnectionMock.mockResolvedValueOnce(connection);
    dbQueryMock.mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, []]);

    const token = asAdmin();
    const response = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validProduct, supplier_id: null });

    expect(response.status).toBe(201);
    expect(connection.query).toHaveBeenCalledTimes(1);
    expect(String(connection.query.mock.calls[0][0])).toMatch(
      /INSERT INTO products/
    );
  });
});

describe("GET /api/suppliers", () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
  });

  test("requires authentication", async () => {
    const response = await request(app).get("/api/suppliers");
    expect(response.status).toBe(401);
  });

  test("returns supplier list for any authenticated user", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 2,
      username: "richmond_manager",
      role: "STORE_MANAGER",
      store_id: 1
    });
    const rows = [
      { id: 1, name: "Pacific Fresh Foods", country: "Canada", contact_email: "x" }
    ];
    dbQueryMock.mockResolvedValueOnce([rows, []]);

    const token = signTestToken({ userId: 2, username: "richmond_manager" });
    const response = await request(app)
      .get("/api/suppliers")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(rows);
  });
});
