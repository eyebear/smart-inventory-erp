import { Response } from "express";
import { db } from "../config/database";
import { AuthRequest } from "../middleware/authMiddleware";

function resolveScope(req: AuthRequest):
  | { ok: true; isAdmin: boolean; storeId: number | null }
  | { ok: false; status: number; message: string } {
  if (!req.user) {
    return { ok: false, status: 401, message: "Authentication required" };
  }

  const isAdmin = req.user.role === "ADMIN";
  if (!isAdmin && req.user.storeId == null) {
    return {
      ok: false,
      status: 403,
      message: "Store-scoped role missing store assignment"
    };
  }

  return { ok: true, isAdmin, storeId: isAdmin ? null : req.user.storeId };
}

export const getWasteAnalytics = async (req: AuthRequest, res: Response) => {
  const scope = resolveScope(req);
  if (!scope.ok) {
    return res.status(scope.status).json({ message: scope.message });
  }

  try {
    const baseQuery = `
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
        st.id AS store_id,
        st.name AS store_name,
        st.city
      FROM waste_records wr
      JOIN inventory_batches ib ON wr.batch_id = ib.id
      JOIN products p ON ib.product_id = p.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      JOIN stores st ON ib.store_id = st.id
    `;

    const [rows] = scope.isAdmin
      ? await db.query(`${baseQuery} ORDER BY wr.waste_date DESC`)
      : await db.query(
          `${baseQuery} WHERE ib.store_id = ? ORDER BY wr.waste_date DESC`,
          [scope.storeId]
        );

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch waste analytics:", error);
    res.status(500).json({ message: "Failed to fetch waste analytics" });
  }
};

export const getWasteSummary = async (req: AuthRequest, res: Response) => {
  const scope = resolveScope(req);
  if (!scope.ok) {
    return res.status(scope.status).json({ message: scope.message });
  }

  try {
    const baseQuery = `
      SELECT
        st.name AS store_name,
        p.category,
        SUM(wr.quantity_wasted) AS total_quantity_wasted,
        SUM(wr.estimated_loss) AS total_estimated_loss
      FROM waste_records wr
      JOIN inventory_batches ib ON wr.batch_id = ib.id
      JOIN products p ON ib.product_id = p.id
      JOIN stores st ON ib.store_id = st.id
    `;

    const groupAndOrder = `
      GROUP BY st.name, p.category
      ORDER BY total_estimated_loss DESC
    `;

    const [rows] = scope.isAdmin
      ? await db.query(`${baseQuery} ${groupAndOrder}`)
      : await db.query(
          `${baseQuery} WHERE ib.store_id = ? ${groupAndOrder}`,
          [scope.storeId]
        );

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch waste summary:", error);
    res.status(500).json({ message: "Failed to fetch waste summary" });
  }
};
