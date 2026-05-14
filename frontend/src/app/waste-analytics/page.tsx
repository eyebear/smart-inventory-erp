"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { authFetch } from "@/lib/api";

type WasteSummary = {
  store_name: string;
  category: string;
  total_quantity_wasted: string;
  total_estimated_loss: string;
};

export default function WasteAnalyticsPage() {
  return (
    <ProtectedRoute>
      <WasteAnalyticsContent />
    </ProtectedRoute>
  );
}

function WasteAnalyticsContent() {
  const { token, logout } = useAuth();
  const [wasteSummary, setWasteSummary] = useState<WasteSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const response = await authFetch("/api/analytics/waste-summary", {
          token
        });

        if (response.status === 401) {
          logout();
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch waste summary");
        }

        const data = (await response.json()) as WasteSummary[];
        if (!cancelled) {
          setWasteSummary(data);
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
      <h1 className="page-title">Waste Analytics</h1>

      <div className="card">
        <p>
          This page summarizes discarded or expired inventory by store and
          product category.
        </p>
      </div>

      <div className="card">
        {loading && <p>Loading…</p>}
        {error && <p>{error}</p>}
        {!loading && !error && wasteSummary.length === 0 && (
          <p>No waste records are available.</p>
        )}
        {!loading && !error && wasteSummary.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Store</th>
                <th>Category</th>
                <th>Total Quantity Wasted</th>
                <th>Total Estimated Loss</th>
              </tr>
            </thead>

            <tbody>
              {wasteSummary.map((item, index) => (
                <tr key={`${item.store_name}-${item.category}-${index}`}>
                  <td>{item.store_name}</td>
                  <td>{item.category}</td>
                  <td>{item.total_quantity_wasted}</td>
                  <td>${Number(item.total_estimated_loss).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
