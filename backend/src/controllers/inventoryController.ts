import { Response } from "express";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "../config/database";
import { AuthRequest } from "../middleware/authMiddleware";
import { buildEventFromRequest, logAuthEvent } from "../services/authAudit";
import {
  NewProductInput,
  insertProduct,
  isDuplicateSkuError,
  isUnknownSupplierError,
  parseNewProduct
} from "../services/productService";

export const getInventory = async (req: AuthRequest, res: Response) => {
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
    const baseQuery = `
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
    `;

    const [rows] = isAdmin
      ? await db.query(`${baseQuery} ORDER BY st.name, p.name_en, ib.expiry_date`)
      : await db.query(
          `${baseQuery} WHERE ib.store_id = ? ORDER BY st.name, p.name_en, ib.expiry_date`,
          [scopedStoreId]
        );

    res.json(rows);
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
};

type CreateBatchBody = {
  product_id: number | null;
  new_product: NewProductInput | null;
  store_id: number;
  batch_code: string;
  quantity: number;
  expiry_date: string | null;
  received_date: string;
};

function parseCreateBody(body: unknown): CreateBatchBody | string {
  if (!body || typeof body !== "object") {
    return "Request body must be a JSON object";
  }
  const raw = body as Record<string, unknown>;

  const hasProductId =
    raw.product_id !== undefined && raw.product_id !== null && raw.product_id !== "";
  const hasNewProduct = raw.new_product !== undefined && raw.new_product !== null;

  if (hasProductId === hasNewProduct) {
    return "Provide exactly one of product_id or new_product";
  }

  let product_id: number | null = null;
  let new_product: NewProductInput | null = null;

  if (hasProductId) {
    product_id = Number(raw.product_id);
    if (!Number.isInteger(product_id) || product_id <= 0) {
      return "product_id must be a positive integer";
    }
  } else {
    const parsed = parseNewProduct(raw.new_product);
    if (!parsed.ok) {
      return parsed.message;
    }
    new_product = parsed.value;
  }

  const store_id = Number(raw.store_id);
  const quantity = Number(raw.quantity);
  const batch_code =
    typeof raw.batch_code === "string" ? raw.batch_code.trim() : "";
  const received_date =
    typeof raw.received_date === "string" ? raw.received_date.trim() : "";
  const expiry_date =
    typeof raw.expiry_date === "string" && raw.expiry_date.trim().length > 0
      ? raw.expiry_date.trim()
      : null;

  if (!Number.isInteger(store_id) || store_id <= 0) {
    return "store_id must be a positive integer";
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return "quantity must be a positive integer";
  }
  if (batch_code.length === 0 || batch_code.length > 100) {
    return "batch_code is required (max 100 chars)";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(received_date)) {
    return "received_date must be YYYY-MM-DD";
  }
  if (expiry_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(expiry_date)) {
    return "expiry_date must be YYYY-MM-DD or omitted";
  }

  return {
    product_id,
    new_product,
    store_id,
    batch_code,
    quantity,
    received_date,
    expiry_date
  };
}

type ProductRow = RowDataPacket & { id: number };
type StoreRow = RowDataPacket & { id: number };

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const createInventoryBatch = async (
  req: AuthRequest,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const parsed = parseCreateBody(req.body);
  if (typeof parsed === "string") {
    return res.status(400).json({ message: parsed });
  }

  const isAdmin = req.user.role === "ADMIN";

  if (!isAdmin) {
    if (req.user.storeId == null) {
      return res
        .status(403)
        .json({ message: "Store-scoped role missing store assignment" });
    }
    if (parsed.store_id !== req.user.storeId) {
      await logAuthEvent(
        buildEventFromRequest(req, {
          action: "AUTHZ_STORE_SCOPE_VIOLATION",
          outcome: "DENY",
          userId: req.user.userId,
          username: req.user.username,
          resource: `${req.method} ${req.originalUrl}`,
          message: `User store ${req.user.storeId} attempted to write to store ${parsed.store_id}`,
          metadata: {
            userStoreId: req.user.storeId,
            requestedStoreId: parsed.store_id
          }
        })
      );
      return res.status(403).json({
        message: "Forbidden: cannot modify inventory for another store"
      });
    }
  }

  const connection = await db.getConnection();
  let createdProductId: number | null = null;
  let transactionStarted = false;

  try {
    const [storeRows] = await connection.query<StoreRow[]>(
      "SELECT id FROM stores WHERE id = ? LIMIT 1",
      [parsed.store_id]
    );
    if (storeRows.length === 0) {
      throw new HttpError(400, "Unknown store_id");
    }

    await connection.beginTransaction();
    transactionStarted = true;

    let productId: number;

    if (parsed.new_product !== null) {
      createdProductId = await insertProduct(connection, parsed.new_product);
      productId = createdProductId;
    } else {
      const [productRows] = await connection.query<ProductRow[]>(
        "SELECT id FROM products WHERE id = ? LIMIT 1",
        [parsed.product_id]
      );
      if (productRows.length === 0) {
        throw new HttpError(400, "Unknown product_id");
      }
      productId = parsed.product_id!;
    }

    const [insertResult] = await connection.query<ResultSetHeader>(
      `
      INSERT INTO inventory_batches
        (product_id, store_id, batch_code, quantity, expiry_date, received_date)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        productId,
        parsed.store_id,
        parsed.batch_code,
        parsed.quantity,
        parsed.expiry_date,
        parsed.received_date
      ]
    );

    const batchId = insertResult.insertId;

    await connection.query(
      `
      INSERT INTO inventory_movements
        (batch_id, movement_type, quantity_change, reason)
      VALUES (?, 'RECEIVED', ?, 'Manual entry via API')
      `,
      [batchId, parsed.quantity]
    );

    await connection.commit();
    transactionStarted = false;

    if (createdProductId !== null && parsed.new_product) {
      await logAuthEvent(
        buildEventFromRequest(req, {
          action: "PRODUCT_CREATE",
          outcome: "SUCCESS",
          userId: req.user.userId,
          username: req.user.username,
          resource: `products#${createdProductId}`,
          message: `Created product ${parsed.new_product.sku} inline with inventory batch`,
          metadata: {
            product_id: createdProductId,
            sku: parsed.new_product.sku,
            inline: true
          }
        })
      );
    }

    await logAuthEvent(
      buildEventFromRequest(req, {
        action: "INVENTORY_CREATE",
        outcome: "SUCCESS",
        userId: req.user.userId,
        username: req.user.username,
        resource: `inventory_batches#${batchId}`,
        message: `Created batch ${parsed.batch_code}`,
        metadata: {
          batch_id: batchId,
          product_id: productId,
          store_id: parsed.store_id,
          quantity: parsed.quantity,
          new_product: createdProductId !== null
        }
      })
    );

    return res.status(201).json({
      batch_id: batchId,
      product_id: productId,
      product_created: createdProductId !== null,
      store_id: parsed.store_id,
      batch_code: parsed.batch_code,
      quantity: parsed.quantity,
      expiry_date: parsed.expiry_date,
      received_date: parsed.received_date
    });
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {
        /* swallow */
      }
    }

    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    if (isDuplicateSkuError(error)) {
      return res.status(409).json({ message: error.message });
    }
    if (isUnknownSupplierError(error)) {
      return res.status(400).json({ message: error.message });
    }

    console.error("Failed to create inventory batch:", error);
    return res.status(500).json({ message: "Failed to create inventory batch" });
  } finally {
    connection.release();
  }
};
