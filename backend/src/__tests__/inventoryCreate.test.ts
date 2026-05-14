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
  const beginTransaction = jest.fn().mockResolvedValue(undefined);
  const commit = jest.fn().mockResolvedValue(undefined);
  const rollback = jest.fn().mockResolvedValue(undefined);
  const release = jest.fn();
  return { query, beginTransaction, commit, rollback, release };
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

function asRichmondManager() {
  findActiveUserByIdMock.mockResolvedValueOnce({
    id: 2,
    username: "richmond_manager",
    role: "STORE_MANAGER",
    store_id: 1
  });
  return signTestToken({ userId: 2, username: "richmond_manager" });
}

function stubExistingProductSuccess(
  connection: ReturnType<typeof makeConnection>
) {
  // The controller queries in this order:
  //   1. store lookup (before transaction)
  //   2. (beginTransaction)
  //   3. product lookup
  //   4. inventory_batches insert
  //   5. inventory_movements insert
  //   6. (commit)
  connection.query
    .mockResolvedValueOnce([[{ id: 1 }], []]) // store check
    .mockResolvedValueOnce([[{ id: 1 }], []]) // product check
    .mockResolvedValueOnce([{ insertId: 42, affectedRows: 1 }, []]) // batch insert
    .mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, []]); // movement insert
}

const validBody = {
  product_id: 1,
  store_id: 1,
  batch_code: "BATCH-TEST-001",
  quantity: 10,
  received_date: "2026-05-14",
  expiry_date: "2026-06-14"
};

describe("POST /api/inventory (existing product)", () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
    dbGetConnectionMock.mockReset();
  });

  test("rejects unauthenticated requests", async () => {
    const response = await request(app).post("/api/inventory").send(validBody);
    expect(response.status).toBe(401);
    expect(dbGetConnectionMock).not.toHaveBeenCalled();
  });

  test("rejects malformed payload with 400", async () => {
    const token = asAdmin();
    const response = await request(app)
      .post("/api/inventory")
      .set("Authorization", `Bearer ${token}`)
      .send({ product_id: 1 });

    expect(response.status).toBe(400);
    expect(dbGetConnectionMock).not.toHaveBeenCalled();
  });

  test("rejects when both product_id and new_product are provided", async () => {
    const token = asAdmin();
    const response = await request(app)
      .post("/api/inventory")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validBody, new_product: { sku: "X", name_en: "X", category: "X", unit_cost: 1 } });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/exactly one/i);
    expect(dbGetConnectionMock).not.toHaveBeenCalled();
  });

  test("ADMIN can create inventory for any store", async () => {
    const connection = makeConnection();
    stubExistingProductSuccess(connection);
    dbQueryMock.mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, []]);
    dbGetConnectionMock.mockResolvedValueOnce(connection);

    const token = asAdmin();
    const response = await request(app)
      .post("/api/inventory")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validBody, store_id: 2 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      batch_id: 42,
      product_id: 1,
      store_id: 2,
      quantity: 10,
      product_created: false
    });
    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);

    const movementCall = connection.query.mock.calls[3];
    expect(movementCall[0]).toMatch(/inventory_movements/);
    expect(movementCall[0]).toMatch(/'RECEIVED'/);
    expect(movementCall[1]).toEqual([42, 10]);

    const auditCall = dbQueryMock.mock.calls.find((c) =>
      String(c[0]).includes("auth_audit_log")
    );
    expect(auditCall).toBeDefined();
    expect(auditCall![1][2]).toBe("INVENTORY_CREATE");
    expect(auditCall![1][4]).toBe("SUCCESS");
  });

  test("STORE_MANAGER can create inventory for their OWN store", async () => {
    const connection = makeConnection();
    stubExistingProductSuccess(connection);
    dbQueryMock.mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, []]);
    dbGetConnectionMock.mockResolvedValueOnce(connection);

    const token = asRichmondManager();
    const response = await request(app)
      .post("/api/inventory")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validBody, store_id: 1 });

    expect(response.status).toBe(201);
    expect(connection.commit).toHaveBeenCalled();
  });

  test("STORE_MANAGER CANNOT create inventory for ANOTHER store and the attempt is audited", async () => {
    dbQueryMock.mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, []]);

    const token = asRichmondManager();
    const response = await request(app)
      .post("/api/inventory")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validBody, store_id: 2 });

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/cannot modify inventory/i);
    expect(dbGetConnectionMock).not.toHaveBeenCalled();

    const auditCall = dbQueryMock.mock.calls.find((c) =>
      String(c[0]).includes("auth_audit_log")
    );
    expect(auditCall).toBeDefined();
    expect(auditCall![1][2]).toBe("AUTHZ_STORE_SCOPE_VIOLATION");
    expect(auditCall![1][4]).toBe("DENY");
  });

  test("rollback fires when batch insert throws inside the transaction", async () => {
    const connection = makeConnection();
    connection.query
      .mockResolvedValueOnce([[{ id: 1 }], []]) // store check
      .mockResolvedValueOnce([[{ id: 1 }], []]) // product check
      .mockRejectedValueOnce(new Error("insert failed")); // batch insert fails
    dbGetConnectionMock.mockResolvedValueOnce(connection);

    const token = asAdmin();
    const response = await request(app)
      .post("/api/inventory")
      .set("Authorization", `Bearer ${token}`)
      .send(validBody);

    expect(response.status).toBe(500);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test("unknown product_id is rejected and rolls back the transaction", async () => {
    const connection = makeConnection();
    connection.query
      .mockResolvedValueOnce([[{ id: 1 }], []]) // store check
      .mockResolvedValueOnce([[], []]); // product check empty
    dbGetConnectionMock.mockResolvedValueOnce(connection);

    const token = asAdmin();
    const response = await request(app)
      .post("/api/inventory")
      .set("Authorization", `Bearer ${token}`)
      .send(validBody);

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/unknown product_id/i);
    expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test("unknown store_id is rejected before transaction begins", async () => {
    const connection = makeConnection();
    connection.query.mockResolvedValueOnce([[], []]); // store check empty
    dbGetConnectionMock.mockResolvedValueOnce(connection);

    const token = asAdmin();
    const response = await request(app)
      .post("/api/inventory")
      .set("Authorization", `Bearer ${token}`)
      .send(validBody);

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/unknown store_id/i);
    expect(connection.beginTransaction).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/inventory (inline new_product)", () => {
  beforeEach(() => {
    dbQueryMock.mockReset();
    dbGetConnectionMock.mockReset();
  });

  const newProductBody = {
    new_product: {
      sku: "SNK-NEW-001",
      name_en: "Crunchy Snack",
      name_zh: "酥脆零食",
      category: "Snack",
      origin_country: "Canada",
      supplier_id: 1,
      unit_cost: 2.5
    },
    store_id: 1,
    batch_code: "BATCH-NEW-001",
    quantity: 25,
    received_date: "2026-05-14",
    expiry_date: "2026-09-14"
  };

  test("ADMIN can create a product + batch atomically", async () => {
    const connection = makeConnection();
    connection.query
      .mockResolvedValueOnce([[{ id: 1 }], []]) // store check
      .mockResolvedValueOnce([[{ id: 1 }], []]) // supplier lookup inside insertProduct
      .mockResolvedValueOnce([{ insertId: 99, affectedRows: 1 }, []]) // INSERT products
      .mockResolvedValueOnce([{ insertId: 77, affectedRows: 1 }, []]) // INSERT batches
      .mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, []]); // INSERT movements
    dbGetConnectionMock.mockResolvedValueOnce(connection);

    // Two audit inserts: PRODUCT_CREATE then INVENTORY_CREATE
    dbQueryMock
      .mockResolvedValueOnce([{ insertId: 1, affectedRows: 1 }, []])
      .mockResolvedValueOnce([{ insertId: 2, affectedRows: 1 }, []]);

    const token = asAdmin();
    const response = await request(app)
      .post("/api/inventory")
      .set("Authorization", `Bearer ${token}`)
      .send(newProductBody);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      batch_id: 77,
      product_id: 99,
      product_created: true,
      store_id: 1
    });
    expect(connection.beginTransaction).toHaveBeenCalled();
    expect(connection.commit).toHaveBeenCalled();
    expect(connection.rollback).not.toHaveBeenCalled();

    const productInsertCall = connection.query.mock.calls[2];
    expect(productInsertCall[0]).toMatch(/INSERT INTO products/);
    expect(productInsertCall[1][0]).toBe("SNK-NEW-001");

    const auditActions = dbQueryMock.mock.calls
      .filter((c) => String(c[0]).includes("auth_audit_log"))
      .map((c) => c[1][2]);
    expect(auditActions).toContain("PRODUCT_CREATE");
    expect(auditActions).toContain("INVENTORY_CREATE");
  });

  test("duplicate SKU surfaces as 409 and rolls back", async () => {
    const connection = makeConnection();
    const dupError: Error & { code: string } = Object.assign(
      new Error("duplicate"),
      { code: "ER_DUP_ENTRY" }
    );
    connection.query
      .mockResolvedValueOnce([[{ id: 1 }], []]) // store check
      .mockResolvedValueOnce([[{ id: 1 }], []]) // supplier check
      .mockRejectedValueOnce(dupError); // INSERT products → duplicate
    dbGetConnectionMock.mockResolvedValueOnce(connection);

    const token = asAdmin();
    const response = await request(app)
      .post("/api/inventory")
      .set("Authorization", `Bearer ${token}`)
      .send(newProductBody);

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/already exists/i);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalledTimes(1);
  });

  test("unknown supplier_id rolls back and returns 400", async () => {
    const connection = makeConnection();
    connection.query
      .mockResolvedValueOnce([[{ id: 1 }], []]) // store check
      .mockResolvedValueOnce([[], []]); // supplier check empty
    dbGetConnectionMock.mockResolvedValueOnce(connection);

    const token = asAdmin();
    const response = await request(app)
      .post("/api/inventory")
      .set("Authorization", `Bearer ${token}`)
      .send(newProductBody);

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/unknown supplier_id/i);
    expect(connection.rollback).toHaveBeenCalled();
  });

  test("STORE_MANAGER creating a new product is still scoped to their store", async () => {
    const token = asRichmondManager();
    const response = await request(app)
      .post("/api/inventory")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...newProductBody, store_id: 2 });

    expect(response.status).toBe(403);
    expect(dbGetConnectionMock).not.toHaveBeenCalled();

    const auditCall = dbQueryMock.mock.calls.find((c) =>
      String(c[0]).includes("auth_audit_log")
    );
    expect(auditCall).toBeDefined();
    expect(auditCall![1][2]).toBe("AUTHZ_STORE_SCOPE_VIOLATION");
  });
});
