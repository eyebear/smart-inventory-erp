import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./config/database";
import productsRoute from "./routes/products";

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

const port = process.env.PORT || 5001;

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});