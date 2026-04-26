"use client";

import { FormEvent, useState } from "react";

type LoginResponse = {
    token: string;
    user: {
        id: number;
        username: string;
        role: string;
        store_id: number | null;
    };
};

export default function LoginPage() {
    const [username, setUsername] = useState("admin");
    const [password, setPassword] = useState("abc123456");
    const [message, setMessage] = useState("");
    const [loginResult, setLoginResult] = useState<LoginResponse | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setMessage("");
        setLoginResult(null);

        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

        try {
            const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.message || "Login failed");
                return;
            }

            localStorage.setItem("authToken", data.token);
            localStorage.setItem("authUser", JSON.stringify(data.user));

            setLoginResult(data);
            setMessage("Login successful");
        } catch {
            setMessage("Unable to connect to backend");
        }
    }

    function handleLogout() {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");

        setLoginResult(null);
        setMessage("Logged out");
    }

    return (
        <div>
            <h1 className="page-title">Login</h1>

            <div className="card">
                <form onSubmit={handleSubmit} className="login-form">
                    <label>
                        Username
                        <input
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                        />
                    </label>

                    <label>
                        Password
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                    </label>

                    <button type="submit">Login</button>
                </form>

                {message && <p>{message}</p>}

                {loginResult && (
                    <div>
                        <h3>User</h3>
                        <p>Username: {loginResult.user.username}</p>
                        <p>Role: {loginResult.user.role}</p>
                        <p>Store ID: {loginResult.user.store_id ?? "All stores"}</p>
                        <button type="button" onClick={handleLogout}>
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}