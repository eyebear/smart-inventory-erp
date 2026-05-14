import { Response } from "express";
import { db } from "../config/database";
import { AuthRequest } from "../middleware/authMiddleware";

export const getSuppliers = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const [rows] = await db.query(
      "SELECT id, name, country, contact_email FROM suppliers ORDER BY name ASC"
    );
    return res.json(rows);
  } catch (error) {
    console.error("Failed to fetch suppliers:", error);
    return res.status(500).json({ message: "Failed to fetch suppliers" });
  }
};
