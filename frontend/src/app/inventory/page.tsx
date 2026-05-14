"use client";

import { useCallback, useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import AddInventoryForm from "@/components/AddInventoryForm";
import { authFetch } from "@/lib/api";

type InventoryBatch = {
  batch_id: number;
  batch_code: string;
  quantity: number;
  expiry_date: string;
  received_date: string;
  product_id: number;
  sku: string;
  name_en: string;
  name_zh: string;
  category: string;
  store_id: number;
  store_name: string;
  city: string;
};

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-CA");
}

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <InventoryContent />
    </ProtectedRoute>
  );
}

function InventoryContent() {
  const { token, logout } = useAuth();
  const [inventory, setInventory] = useState<InventoryBatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch("/api/inventory", { token });

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch inventory");
      }

      const data = (await response.json()) as InventoryBatch[];
      setInventory(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load, refreshKey]);

  return (
    <div>
      <h1 className="page-title">Inventory</h1>

      <AddInventoryForm onCreated={() => setRefreshKey((k) => k + 1)} />

      <div className="card">
        {loading && <p>Loading…</p>}
        {error && <p>{error}</p>}
        {!loading && !error && (
          <table>
            <thead>
              <tr>
                <th>Store</th>
                <th>SKU</th>
                <th>Product</th>
                <th>Chinese Name</th>
                <th>Category</th>
                <th>Batch Code</th>
                <th>Quantity</th>
                <th>Received Date</th>
                <th>Expiry Date</th>
              </tr>
            </thead>

            <tbody>
              {inventory.map((item) => (
                <tr key={item.batch_id}>
                  <td>{item.store_name}</td>
                  <td>{item.sku}</td>
                  <td>{item.name_en}</td>
                  <td>{item.name_zh}</td>
                  <td>{item.category}</td>
                  <td>{item.batch_code}</td>
                  <td>{item.quantity}</td>
                  <td>{formatDate(item.received_date)}</td>
                  <td>{formatDate(item.expiry_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
