import { PoolConnection, ResultSetHeader } from "mysql2/promise";

export type NewProductInput = {
  sku: string;
  name_en: string;
  name_zh: string | null;
  category: string;
  origin_country: string | null;
  supplier_id: number | null;
  unit_cost: number;
};

export type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

export function parseNewProduct(input: unknown): ParseResult<NewProductInput> {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "new_product must be an object" };
  }
  const raw = input as Record<string, unknown>;

  const sku = typeof raw.sku === "string" ? raw.sku.trim() : "";
  const name_en = typeof raw.name_en === "string" ? raw.name_en.trim() : "";
  const category = typeof raw.category === "string" ? raw.category.trim() : "";
  const name_zh =
    typeof raw.name_zh === "string" && raw.name_zh.trim().length > 0
      ? raw.name_zh.trim()
      : null;
  const origin_country =
    typeof raw.origin_country === "string" && raw.origin_country.trim().length > 0
      ? raw.origin_country.trim()
      : null;
  const supplier_id =
    raw.supplier_id === null || raw.supplier_id === undefined || raw.supplier_id === ""
      ? null
      : Number(raw.supplier_id);
  const unit_cost = Number(raw.unit_cost);

  if (sku.length === 0 || sku.length > 50) {
    return { ok: false, message: "sku is required (max 50 chars)" };
  }
  if (name_en.length === 0 || name_en.length > 150) {
    return { ok: false, message: "name_en is required (max 150 chars)" };
  }
  if (category.length === 0 || category.length > 100) {
    return { ok: false, message: "category is required (max 100 chars)" };
  }
  if (name_zh !== null && name_zh.length > 150) {
    return { ok: false, message: "name_zh must be at most 150 chars" };
  }
  if (origin_country !== null && origin_country.length > 100) {
    return { ok: false, message: "origin_country must be at most 100 chars" };
  }
  if (supplier_id !== null && (!Number.isInteger(supplier_id) || supplier_id <= 0)) {
    return { ok: false, message: "supplier_id must be a positive integer" };
  }
  if (!Number.isFinite(unit_cost) || unit_cost < 0) {
    return { ok: false, message: "unit_cost must be a non-negative number" };
  }

  return {
    ok: true,
    value: {
      sku,
      name_en,
      category,
      name_zh,
      origin_country,
      supplier_id,
      unit_cost
    }
  };
}

export type DuplicateSkuError = Error & { code: "DUPLICATE_SKU" };
export type ProductSupplierMissingError = Error & {
  code: "UNKNOWN_SUPPLIER";
};

export function isDuplicateSkuError(error: unknown): error is DuplicateSkuError {
  return (
    error instanceof Error &&
    (error as { code?: string }).code === "DUPLICATE_SKU"
  );
}

export function isUnknownSupplierError(
  error: unknown
): error is ProductSupplierMissingError {
  return (
    error instanceof Error &&
    (error as { code?: string }).code === "UNKNOWN_SUPPLIER"
  );
}

export async function insertProduct(
  connection: PoolConnection,
  input: NewProductInput
): Promise<number> {
  if (input.supplier_id !== null) {
    const [supplierRows] = await connection.query<
      ({ id: number } & import("mysql2").RowDataPacket)[]
    >("SELECT id FROM suppliers WHERE id = ? LIMIT 1", [input.supplier_id]);
    if (supplierRows.length === 0) {
      const err = new Error("Unknown supplier_id") as ProductSupplierMissingError;
      err.code = "UNKNOWN_SUPPLIER";
      throw err;
    }
  }

  try {
    const [result] = await connection.query<ResultSetHeader>(
      `
      INSERT INTO products
        (sku, name_en, name_zh, category, origin_country, supplier_id, unit_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.sku,
        input.name_en,
        input.name_zh,
        input.category,
        input.origin_country,
        input.supplier_id,
        input.unit_cost
      ]
    );
    return result.insertId;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "ER_DUP_ENTRY"
    ) {
      const err = new Error(
        `A product with SKU "${input.sku}" already exists`
      ) as DuplicateSkuError;
      err.code = "DUPLICATE_SKU";
      throw err;
    }
    throw error;
  }
}
