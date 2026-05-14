import request from "supertest";

jest.mock("../services/authService", () => ({
  __esModule: true,
  validateUser: jest.fn(),
  findActiveUserById: jest.fn()
}));

jest.mock("../services/legacySupplierService", () => ({
  __esModule: true,
  fetchLegacySuppliers: jest.fn()
}));

import app from "../app";
import { findActiveUserById } from "../services/authService";
import { fetchLegacySuppliers } from "../services/legacySupplierService";
import { signTestToken } from "./testHelpers";

const findActiveUserByIdMock = findActiveUserById as jest.MockedFunction<
  typeof findActiveUserById
>;
const fetchLegacySuppliersMock = fetchLegacySuppliers as jest.MockedFunction<
  typeof fetchLegacySuppliers
>;

describe("Legacy Suppliers API", () => {
  beforeEach(() => {
    fetchLegacySuppliersMock.mockReset();
  });

  test("GET /api/legacy-suppliers should reject unauthenticated requests", async () => {
    const response = await request(app).get("/api/legacy-suppliers");
    expect(response.status).toBe(401);
  });

  test("GET /api/legacy-suppliers should forbid non-ADMIN users", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 2,
      username: "richmond_manager",
      role: "STORE_MANAGER",
      store_id: 1
    });

    const token = signTestToken({ userId: 2, username: "richmond_manager" });
    const response = await request(app)
      .get("/api/legacy-suppliers")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(fetchLegacySuppliersMock).not.toHaveBeenCalled();
  });

  test("GET /api/legacy-suppliers returns 200 with suppliers for ADMIN", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 1,
      username: "admin",
      role: "ADMIN",
      store_id: null
    });
    fetchLegacySuppliersMock.mockResolvedValueOnce([
      {
        legacy_supplier_id: "LS-1",
        name: "Legacy",
        country: "JP",
        category: "Imports",
        contact_email: "x@example.com",
        status: "active"
      }
    ]);

    const token = signTestToken({ userId: 1, username: "admin" });
    const response = await request(app)
      .get("/api/legacy-suppliers")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      source: "legacy-php-service",
      count: 1
    });
  });

  test("GET /api/legacy-suppliers surfaces 502 if PHP service fails", async () => {
    findActiveUserByIdMock.mockResolvedValueOnce({
      id: 1,
      username: "admin",
      role: "ADMIN",
      store_id: null
    });
    fetchLegacySuppliersMock.mockRejectedValueOnce(new Error("php down"));

    const token = signTestToken({ userId: 1, username: "admin" });
    const response = await request(app)
      .get("/api/legacy-suppliers")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(502);
  });
});
