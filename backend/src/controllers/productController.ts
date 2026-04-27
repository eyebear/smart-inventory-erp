import { Request, Response } from "express";
import { db } from "../config/database";

export const getProducts = async (req: Request, res: Response) => {
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
      ORDER BY p.id ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch products:", error);

    res.status(500).json({
      message: "Failed to fetch products"
    });
  }
};