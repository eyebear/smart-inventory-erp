"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { authFetch } from "@/lib/api";

type Store = {
  id: number;
  name: string;
  city: string;
};

type Product = {
  id: number;
  sku: string;
  name_en: string;
};

type Supplier = {
  id: number;
  name: string;
  country: string | null;
};

type ProductMode = "existing" | "new";

type AddInventoryFormProps = {
  onCreated: () => void;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AddInventoryForm({ onCreated }: AddInventoryFormProps) {
  const { token, user, logout } = useAuth();

  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [productMode, setProductMode] = useState<ProductMode>("existing");
  const [productId, setProductId] = useState<string>("");
  const [storeId, setStoreId] = useState<string>(
    user && user.role !== "ADMIN" && user.store_id != null
      ? String(user.store_id)
      : ""
  );

  // New-product fields
  const [newSku, setNewSku] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newNameZh, setNewNameZh] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newOriginCountry, setNewOriginCountry] = useState("");
  const [newSupplierId, setNewSupplierId] = useState("");
  const [newUnitCost, setNewUnitCost] = useState("0");

  // Batch fields
  const [batchCode, setBatchCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [receivedDate, setReceivedDate] = useState(todayIso());
  const [expiryDate, setExpiryDate] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [storesRes, productsRes, suppliersRes] = await Promise.all([
          authFetch("/api/stores", { token }),
          authFetch("/api/products", { token }),
          authFetch("/api/suppliers", { token })
        ]);

        if (
          storesRes.status === 401 ||
          productsRes.status === 401 ||
          suppliersRes.status === 401
        ) {
          logout();
          return;
        }
        if (!storesRes.ok || !productsRes.ok || !suppliersRes.ok) {
          throw new Error("Failed to load form options");
        }

        const storesData = (await storesRes.json()) as Store[];
        const productsData = (await productsRes.json()) as Product[];
        const suppliersData = (await suppliersRes.json()) as Supplier[];

        if (cancelled) return;

        setStores(storesData);
        setProducts(productsData);
        setSuppliers(suppliersData);

        if (!isAdmin && storesData.length === 1) {
          setStoreId(String(storesData[0].id));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token, logout, isAdmin]);

  function resetForm() {
    setBatchCode("");
    setQuantity("1");
    setExpiryDate("");
    setNewSku("");
    setNewNameEn("");
    setNewNameZh("");
    setNewCategory("");
    setNewOriginCountry("");
    setNewSupplierId("");
    setNewUnitCost("0");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      store_id: Number(storeId),
      batch_code: batchCode,
      quantity: Number(quantity),
      received_date: receivedDate,
      expiry_date: expiryDate || null
    };

    if (productMode === "existing") {
      payload.product_id = Number(productId);
    } else {
      payload.new_product = {
        sku: newSku,
        name_en: newNameEn,
        name_zh: newNameZh || null,
        category: newCategory,
        origin_country: newOriginCountry || null,
        supplier_id: newSupplierId === "" ? null : Number(newSupplierId),
        unit_cost: Number(newUnitCost)
      };
    }

    try {
      const response = await authFetch("/api/inventory", {
        method: "POST",
        token,
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        logout();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          (data && typeof data.message === "string" && data.message) ||
            `Request failed (${response.status})`
        );
        return;
      }

      setInfo(
        data.product_created
          ? `Created product (id ${data.product_id}) and batch ${data.batch_code} (id ${data.batch_id})`
          : `Created batch ${data.batch_code} (id ${data.batch_id})`
      );
      resetForm();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h2>Add Inventory Batch</h2>
      <p className="form-hint">
        {isAdmin
          ? "Admins can add inventory to any store."
          : "You can only add inventory to your assigned store."}
      </p>

      <form onSubmit={handleSubmit} className="inventory-form">
        <fieldset className="inventory-form__mode">
          <legend>Product</legend>
          <label className="inventory-form__mode-option">
            <input
              type="radio"
              name="productMode"
              value="existing"
              checked={productMode === "existing"}
              onChange={() => setProductMode("existing")}
            />
            Use existing product
          </label>
          <label className="inventory-form__mode-option">
            <input
              type="radio"
              name="productMode"
              value="new"
              checked={productMode === "new"}
              onChange={() => setProductMode("new")}
            />
            Create new product
          </label>
        </fieldset>

        {productMode === "existing" ? (
          <label className="inventory-form__full">
            Product
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              required
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.sku} — {product.name_en}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="inventory-form__new-product">
            <label>
              SKU
              <input
                value={newSku}
                onChange={(event) => setNewSku(event.target.value)}
                required
                maxLength={50}
                placeholder="e.g. SNK-002"
              />
            </label>
            <label>
              English Name
              <input
                value={newNameEn}
                onChange={(event) => setNewNameEn(event.target.value)}
                required
                maxLength={150}
              />
            </label>
            <label>
              Chinese Name (optional)
              <input
                value={newNameZh}
                onChange={(event) => setNewNameZh(event.target.value)}
                maxLength={150}
              />
            </label>
            <label>
              Category
              <input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                required
                maxLength={100}
                placeholder="e.g. Snack"
              />
            </label>
            <label>
              Origin Country (optional)
              <input
                value={newOriginCountry}
                onChange={(event) => setNewOriginCountry(event.target.value)}
                maxLength={100}
              />
            </label>
            <label>
              Supplier (optional)
              <select
                value={newSupplierId}
                onChange={(event) => setNewSupplierId(event.target.value)}
              >
                <option value="">No supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                    {supplier.country ? ` (${supplier.country})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Unit Cost
              <input
                type="number"
                min={0}
                step="0.01"
                value={newUnitCost}
                onChange={(event) => setNewUnitCost(event.target.value)}
                required
              />
            </label>
          </div>
        )}

        <label>
          Store
          <select
            value={storeId}
            onChange={(event) => setStoreId(event.target.value)}
            required
            disabled={!isAdmin && stores.length <= 1}
          >
            <option value="">Select a store</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name} ({store.city})
              </option>
            ))}
          </select>
        </label>

        <label>
          Batch Code
          <input
            value={batchCode}
            onChange={(event) => setBatchCode(event.target.value)}
            required
            maxLength={100}
          />
        </label>

        <label>
          Quantity
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />
        </label>

        <label>
          Received Date
          <input
            type="date"
            value={receivedDate}
            onChange={(event) => setReceivedDate(event.target.value)}
            required
          />
        </label>

        <label>
          Expiry Date (optional)
          <input
            type="date"
            value={expiryDate}
            onChange={(event) => setExpiryDate(event.target.value)}
          />
        </label>

        <div className="inventory-form__actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Add Batch"}
          </button>
        </div>
      </form>

      {error && <p className="login-error">{error}</p>}
      {info && <p className="form-success">{info}</p>}
    </div>
  );
}
