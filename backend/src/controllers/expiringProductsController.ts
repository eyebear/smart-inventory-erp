import { Response } from "express";
import { db } from "../config/database";
import { AuthRequest } from "../middleware/authMiddleware";

export const getExpiringProducts = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const isAdmin = req.user.role === "ADMIN";
  const scopedStoreId = isAdmin ? null : req.user.storeId;

  if (!isAdmin && scopedStoreId == null) {
    return res
      .status(403)
      .json({ message: "Store-scoped role missing store assignment" });
  }

  try {
    const days = Number(req.query.days || 3);

    const baseQuery = `
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
    `;

    const [rows] = isAdmin
      ? await db.query(`${baseQuery} ORDER BY ib.expiry_date ASC`, [days])
      : await db.query(
          `${baseQuery} AND ib.store_id = ? ORDER BY ib.expiry_date ASC`,
          [days, scopedStoreId]
        );

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch expiring products:", error);
    res.status(500).json({ message: "Failed to fetch expiring products" });
  }
};
