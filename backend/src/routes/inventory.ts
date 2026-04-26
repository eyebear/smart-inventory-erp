import { Router } from "express";
import { db } from "../config/database";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        ib.id AS batch_id,
        ib.batch_code,
        ib.quantity,
        ib.expiry_date,
        ib.received_date,
        p.id AS product_id,
        p.sku,
        p.name_en,
        p.name_zh,
        p.category,
        st.id AS store_id,
        st.name AS store_name,
        st.city
      FROM inventory_batches ib
      JOIN products p ON ib.product_id = p.id
      JOIN stores st ON ib.store_id = st.id
      ORDER BY st.name, p.name_en, ib.expiry_date
    `);

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

export default router;