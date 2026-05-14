"use client";

import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({
  children
}: {
  children: React.ReactNode;
}) {
  const { status } = useAuth();

  if (status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
}
