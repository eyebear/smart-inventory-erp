import { Router } from "express";
import { db } from "../config/database";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.id,
        p.sku,
        p.name_en,
        p.name_zh,
        p.category,
        p.origin_country,
        s.name AS supplier_name
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
    `);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

export default router;