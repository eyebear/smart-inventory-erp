"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      <div className="card">
        <h2>Smart Inventory ERP</h2>
        <p>
          This dashboard supports multi-store inventory tracking, expiry
          monitoring, supplier integration, and waste analytics.
        </p>
        {user && (
          <p>
            Signed in as <strong>{user.username}</strong> ({user.role})
          </p>
        )}
      </div>

      <div className="card">
        <h2>System Modules</h2>
        <ul>
          <li>Product master data</li>
          <li>Batch-level inventory tracking</li>
          <li>Expiring product alerts</li>
          <li>Waste cost analytics</li>
          <li>Legacy PHP supplier integration</li>
        </ul>
      </div>
    </div>
  );
}
