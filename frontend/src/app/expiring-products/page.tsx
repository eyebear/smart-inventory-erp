"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { authFetch } from "@/lib/api";

type ExpiringProduct = {
  batch_id: number;
  batch_code: string;
  quantity: number;
  expiry_date: string;
  days_until_expiry: number;
  product_id: number;
  sku: string;
  name_en: string;
  name_zh: string;
  category: string;
  store_id: number;
  store_name: string;
  city: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-CA");
}

export default function ExpiringProductsPage() {
  return (
    <ProtectedRoute>
      <ExpiringProductsContent />
    </ProtectedRoute>
  );
}

function ExpiringProductsContent() {
  const { token, logout } = useAuth();
  const [products, setProducts] = useState<ExpiringProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const response = await authFetch("/api/expiring-products?days=10", {
          token
        });

        if (response.status === 401) {
          logout();
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch expiring products");
        }

        const data = (await response.json()) as ExpiringProduct[];
        if (!cancelled) {
          setProducts(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  return (
    <div>
      <h1 className="page-title">Expiring Products</h1>

      <div className="card">
        <p>
          Products listed here are expiring soon and should be reviewed by store
          managers.
        </p>
      </div>

      <div className="card">
        {loading && <p>Loading…</p>}
        {error && <p>{error}</p>}
        {!loading && !error && products.length === 0 && (
          <p>No products are expiring within the selected window.</p>
        )}
        {!loading && !error && products.length > 0 && (
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
                <th>Expiry Date</th>
                <th>Days Left</th>
              </tr>
            </thead>

            <tbody>
              {products.map((item) => (
                <tr key={item.batch_id}>
                  <td>{item.store_name}</td>
                  <td>{item.sku}</td>
                  <td>{item.name_en}</td>
                  <td>{item.name_zh}</td>
                  <td>{item.category}</td>
                  <td>{item.batch_code}</td>
                  <td>{item.quantity}</td>
                  <td>{formatDate(item.expiry_date)}</td>
                  <td>{item.days_until_expiry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
