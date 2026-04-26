import { Router } from "express";
import { db } from "../config/database";

const router = Router();

router.get("/waste", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        wr.id AS waste_record_id,
        wr.quantity_wasted,
        wr.waste_reason,
        wr.waste_date,
        wr.estimated_loss,
        ib.batch_code,
        p.sku,
        p.name_en,
        p.name_zh,
        p.category,
        s.name AS supplier_name,
        st.name AS store_name,
        st.city
      FROM waste_records wr
      JOIN inventory_batches ib ON wr.batch_id = ib.id
      JOIN products p ON ib.product_id = p.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      JOIN stores st ON ib.store_id = st.id
      ORDER BY wr.waste_date DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch waste analytics:", error);
    res.status(500).json({ message: "Failed to fetch waste analytics" });
  }
});

router.get("/waste-summary", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        st.name AS store_name,
        p.category,
        SUM(wr.quantity_wasted) AS total_quantity_wasted,
        SUM(wr.estimated_loss) AS total_estimated_loss
      FROM waste_records wr
      JOIN inventory_batches ib ON wr.batch_id = ib.id
      JOIN products p ON ib.product_id = p.id
      JOIN stores st ON ib.store_id = st.id
      GROUP BY st.name, p.category
      ORDER BY total_estimated_loss DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch waste summary:", error);
    res.status(500).json({ message: "Failed to fetch waste summary" });
  }
});

export default router;