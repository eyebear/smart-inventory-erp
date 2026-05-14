"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { login, status } = useAuth();

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("abc123456");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setSubmitting(true);

    try {
      await login(username, password);
      router.replace("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <h1 className="page-title">Smart Inventory ERP</h1>

      <div className="card">
        <h2>Login</h2>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          <button type="submit" disabled={submitting || status === "loading"}>
            {submitting ? "Signing in…" : "Login"}
          </button>
        </form>

        {message && <p className="login-error">{message}</p>}
      </div>
    </div>
  );
}
