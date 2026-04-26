import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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

const port = process.env.PORT || 5001;

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});