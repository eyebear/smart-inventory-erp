import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./config/database";
import productsRoute from "./routes/products";
import inventoryRoute from "./routes/inventory";
import expiringProductsRoute from "./routes/expiringProducts";
import analyticsRoute from "./routes/analytics";
import legacySuppliersRoute from "./routes/legacySuppliers";
import authRoute from "./routes/auth";

dotenv.config();

const app = express();

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

app.use("/api/products", productsRoute);

app.use("/api/inventory", inventoryRoute);

app.use("/api/expiring-products", expiringProductsRoute);

app.use("/api/analytics", analyticsRoute);

app.use("/api/legacy-suppliers", legacySuppliersRoute);

app.use("/api/auth", authRoute);

const port = process.env.PORT || 5001;

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});