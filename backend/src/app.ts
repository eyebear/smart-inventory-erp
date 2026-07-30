import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";

import { db } from "./config/database";
import productsRoute from "./routes/products";
import inventoryRoute from "./routes/inventory";
import expiringProductsRoute from "./routes/expiringProducts";
import analyticsRoute from "./routes/analytics";
import legacySuppliersRoute from "./routes/legacySuppliers";
import authRoute from "./routes/auth";
import storesRoute from "./routes/stores";
import auditLogRoute from "./routes/auditLog";
import suppliersRoute from "./routes/suppliers";
import retailMediaRoute from "./routes/retailMedia";

import { authenticateToken } from "./middleware/authMiddleware";
import { requireRole } from "./middleware/roleMiddleware";

dotenv.config();

const app = express();

const trustProxy = process.env.TRUST_PROXY;
if (trustProxy && trustProxy.length > 0) {
  if (trustProxy === "true") {
    app.set("trust proxy", true);
  } else if (trustProxy === "false") {
    app.set("trust proxy", false);
  } else if (/^\d+$/.test(trustProxy)) {
    app.set("trust proxy", Number(trustProxy));
  } else {
    app.set("trust proxy", trustProxy);
  }
} else {
  app.set("trust proxy", false);
}

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (!req.app.get("trust proxy") && "x-forwarded-proto" in req.headers) {
    delete req.headers["x-forwarded-proto"];
    delete req.headers["x-forwarded-for"];
    delete req.headers["x-forwarded-host"];
  }
  next();
});

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Smart Inventory ERP Backend"
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS result");

    res.json({
      status: "ok",
      database: "connected",
      result: rows
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      status: "error",
      message: "Database connection failed"
    });
  }
});

app.get("/api/protected-test", authenticateToken, (req, res) => {
  res.json({
    message: "Protected route accessed successfully"
  });
});

app.get(
  "/api/admin-test",
  authenticateToken,
  requireRole("ADMIN"),
  (req, res) => {
    res.json({
      message: "Admin-only route accessed successfully"
    });
  }
);

app.use("/api/products", productsRoute);
app.use("/api/inventory", inventoryRoute);
app.use("/api/expiring-products", expiringProductsRoute);
app.use("/api/analytics", analyticsRoute);
app.use("/api/legacy-suppliers", legacySuppliersRoute);
app.use("/api/auth", authRoute);
app.use("/api/stores", storesRoute);
app.use("/api/audit-log", auditLogRoute);
app.use("/api/suppliers", suppliersRoute);
app.use("/api/retail-media", retailMediaRoute);

export default app;
