"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { authFetch } from "@/lib/api";

type AuditEvent = {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  resource: string | null;
  outcome: "SUCCESS" | "DENY" | "ERROR";
  ip_address: string | null;
  user_agent: string | null;
  message: string | null;
  metadata: unknown;
  created_at: string;
};

export default function AuditPage() {
  return (
    <ProtectedRoute>
      <AuditContent />
    </ProtectedRoute>
  );
}

function AuditContent() {
  const { token, logout, user } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (user && user.role !== "ADMIN") {
        if (!cancelled) {
          setError("Audit log is admin-only");
          setLoading(false);
        }
        return;
      }
      try {
        const response = await authFetch("/api/audit-log?limit=200", { token });
        if (response.status === 401) {
          logout();
          return;
        }
        if (response.status === 403) {
          if (!cancelled) setError("Audit log is admin-only");
          return;
        }
        if (!response.ok) {
          throw new Error("Failed to fetch audit log");
        }
        const data = (await response.json()) as AuditEvent[];
        if (!cancelled) setEvents(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    queueMicrotask(() => {
      void load();
    });
    return () => {
      cancelled = true;
    };
  }, [token, logout, user]);

  return (
    <div>
      <h1 className="page-title">Audit Log</h1>

      <div className="card">
        <p>Auth and authorization events. Newest first; capped at 200 rows.</p>
      </div>

      <div className="card">
        {loading && <p>Loading…</p>}
        {error && <p className="login-error">{error}</p>}
        {!loading && !error && (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>User</th>
                <th>Action</th>
                <th>Outcome</th>
                <th>Resource</th>
                <th>IP</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{new Date(event.created_at).toLocaleString()}</td>
                  <td>{event.username ?? "(anon)"}</td>
                  <td>{event.action}</td>
                  <td>
                    <span className={`audit-outcome audit-outcome--${event.outcome.toLowerCase()}`}>
                      {event.outcome}
                    </span>
                  </td>
                  <td>{event.resource ?? ""}</td>
                  <td>{event.ip_address ?? ""}</td>
                  <td>{event.message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
