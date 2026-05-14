"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { authFetch } from "@/lib/api";

type Product = {
  id: number;
  sku: string;
  name_en: string;
  name_zh: string;
  category: string;
  origin_country: string;
  supplier_name: string;
};

export default function ProductsPage() {
  return (
    <ProtectedRoute>
      <ProductsContent />
    </ProtectedRoute>
  );
}

function ProductsContent() {
  const { token, logout } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const response = await authFetch("/api/products", { token });

        if (response.status === 401) {
          logout();
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data = (await response.json()) as Product[];
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
      <h1 className="page-title">Products</h1>

      <div className="card">
        {loading && <p>Loading…</p>}
        {error && <p>{error}</p>}
        {!loading && !error && (
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>English Name</th>
                <th>Chinese Name</th>
                <th>Category</th>
                <th>Origin</th>
                <th>Supplier</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.sku}</td>
                  <td>{product.name_en}</td>
                  <td>{product.name_zh}</td>
                  <td>{product.category}</td>
                  <td>{product.origin_country}</td>
                  <td>{product.supplier_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
