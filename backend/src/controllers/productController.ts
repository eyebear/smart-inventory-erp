import { Response } from "express";
import { db } from "../config/database";
import { AuthRequest } from "../middleware/authMiddleware";
import { buildEventFromRequest, logAuthEvent } from "../services/authAudit";
import {
  insertProduct,
  isDuplicateSkuError,
  isUnknownSupplierError,
  parseNewProduct
} from "../services/productService";

export const getProducts = async (req: AuthRequest, res: Response) => {
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
    if (isAdmin) {
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

      return res.json(rows);
    }

    const [rows] = await db.query(
      `
      SELECT DISTINCT
        p.id,
        p.sku,
        p.name_en,
        p.name_zh,
        p.category,
        p.origin_country,
        s.name AS supplier_name
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      INNER JOIN inventory_batches ib ON ib.product_id = p.id
      WHERE ib.store_id = ?
      ORDER BY p.id ASC
      `,
      [scopedStoreId]
    );

    return res.json(rows);
  } catch (error) {
    console.error("Failed to fetch products:", error);

    return res.status(500).json({
      message: "Failed to fetch products"
    });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const parsed = parseNewProduct(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ message: parsed.message });
  }

  const connection = await db.getConnection();
  try {
    const productId = await insertProduct(connection, parsed.value);

    await logAuthEvent(
      buildEventFromRequest(req, {
        action: "PRODUCT_CREATE",
        outcome: "SUCCESS",
        userId: req.user.userId,
        username: req.user.username,
        resource: `products#${productId}`,
        message: `Created product ${parsed.value.sku}`,
        metadata: {
          product_id: productId,
          sku: parsed.value.sku,
          category: parsed.value.category
        }
      })
    );

    return res.status(201).json({
      id: productId,
      sku: parsed.value.sku,
      name_en: parsed.value.name_en,
      name_zh: parsed.value.name_zh,
      category: parsed.value.category,
      origin_country: parsed.value.origin_country,
      supplier_id: parsed.value.supplier_id,
      unit_cost: parsed.value.unit_cost
    });
  } catch (error) {
    if (isDuplicateSkuError(error)) {
      return res.status(409).json({ message: error.message });
    }
    if (isUnknownSupplierError(error)) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Failed to create product:", error);
    return res.status(500).json({ message: "Failed to create product" });
  } finally {
    connection.release();
  }
};
