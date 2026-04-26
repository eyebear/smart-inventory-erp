import { Router } from "express";
import { db } from "../config/database";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const days = Number(req.query.days || 3);

    const [rows] = await db.query(
      `
      SELECT
        ib.id AS batch_id,
        ib.batch_code,
        ib.quantity,
        ib.expiry_date,
        DATEDIFF(ib.expiry_date, CURRENT_DATE) AS days_until_expiry,
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
      WHERE ib.expiry_date IS NOT NULL
        AND ib.expiry_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL ? DAY)
        AND ib.quantity > 0
      ORDER BY ib.expiry_date ASC
      `,
      [days]
    );

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch expiring products:", error);
    res.status(500).json({ message: "Failed to fetch expiring products" });
  }
});

export default router;