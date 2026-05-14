"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
  authFetch
} from "@/lib/api";

export type AuthUser = {
  id: number;
  username: string;
  role: string;
  store_id: number | null;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  status: "loading" | "authenticated" | "unauthenticated";
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export const PUBLIC_ROUTES = new Set<string>(["/login"]);

export function isPublicRoute(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  return PUBLIC_ROUTES.has(pathname);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">(
    "loading"
  );

  const hasBootstrapped = useRef(false);

  const clearSession = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
    setUser(null);
    setToken(null);
    setStatus("unauthenticated");
  }, []);

  const verifyToken = useCallback(
    async (existingToken: string) => {
      try {
        const response = await authFetch("/api/auth/me", {
          token: existingToken
        });

        if (!response.ok) {
          clearSession();
          return null;
        }

        const data = (await response.json()) as { user: AuthUser };
        setUser(data.user);
        setToken(existingToken);
        setStatus("authenticated");

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            AUTH_USER_STORAGE_KEY,
            JSON.stringify(data.user)
          );
        }

        return data.user;
      } catch {
        clearSession();
        return null;
      }
    },
    [clearSession]
  );

  useEffect(() => {
    if (hasBootstrapped.current) {
      return;
    }
    hasBootstrapped.current = true;

    if (typeof window === "undefined") {
      return;
    }

    const storedToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

    queueMicrotask(() => {
      if (!storedToken) {
        setStatus("unauthenticated");
        return;
      }

      void verifyToken(storedToken);
    });
  }, [verifyToken]);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    const publicRoute = isPublicRoute(pathname);

    if (status === "unauthenticated" && !publicRoute) {
      router.replace("/login");
      return;
    }

    if (status === "authenticated" && publicRoute) {
      router.replace("/");
    }
  }, [status, pathname, router]);

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await authFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          (data && typeof data.message === "string" && data.message) ||
          "Login failed";
        throw new Error(message);
      }

      const nextToken: string = data.token;
      const nextUser: AuthUser = data.user;

      if (typeof window !== "undefined") {
        window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, nextToken);
        window.localStorage.setItem(
          AUTH_USER_STORAGE_KEY,
          JSON.stringify(nextUser)
        );
      }

      setToken(nextToken);
      setUser(nextUser);
      setStatus("authenticated");

      return nextUser;
    },
    []
  );

  const logout = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [clearSession, router]);

  const value = useMemo<AuthState>(
    () => ({ user, token, status, login, logout }),
    [user, token, status, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
