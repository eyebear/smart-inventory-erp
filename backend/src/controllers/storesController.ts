import { Response } from "express";
import { db } from "../config/database";
import { AuthRequest } from "../middleware/authMiddleware";

export const getStores = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const isAdmin = req.user.role === "ADMIN";

  try {
    if (isAdmin) {
      const [rows] = await db.query(
        "SELECT id, name, city, address FROM stores ORDER BY id ASC"
      );
      return res.json(rows);
    }

    if (req.user.storeId == null) {
      return res
        .status(403)
        .json({ message: "Store-scoped role missing store assignment" });
    }

    const [rows] = await db.query(
      "SELECT id, name, city, address FROM stores WHERE id = ?",
      [req.user.storeId]
    );
    return res.json(rows);
  } catch (error) {
    console.error("Failed to fetch stores:", error);
    return res.status(500).json({ message: "Failed to fetch stores" });
  }
};
