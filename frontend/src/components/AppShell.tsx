"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, isPublicRoute } from "./AuthProvider";
import LanguageToggle from "./LanguageToggle";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { status, user, logout } = useAuth();
  const pathname = usePathname();
  const publicRoute = isPublicRoute(pathname);

  if (status === "loading") {
    return (
      <div className="auth-loading">
        <p>Loading…</p>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <main className="content content--auth">{children}</main>;
  }

  if (publicRoute) {
    return <main className="content content--auth">{children}</main>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>Smart Inventory ERP</h2>
        <LanguageToggle />

        {user && (
          <div className="sidebar-user">
            <p className="sidebar-user__name">{user.username}</p>
            <p className="sidebar-user__role">{user.role}</p>
          </div>
        )}

        <nav>
          <Link href="/">
            <span className="lang-en">Dashboard</span>
            <span className="lang-zh">仪表盘</span>
          </Link>

          <Link href="/products">
            <span className="lang-en">Products</span>
            <span className="lang-zh">商品管理</span>
          </Link>

          <Link href="/inventory">
            <span className="lang-en">Inventory</span>
            <span className="lang-zh">库存管理</span>
          </Link>

          <Link href="/expiring-products">
            <span className="lang-en">Expiring Products</span>
            <span className="lang-zh">临期商品</span>
          </Link>

          <Link href="/waste-analytics">
            <span className="lang-en">Waste Analytics</span>
            <span className="lang-zh">损耗分析</span>
          </Link>

          {user?.role === "ADMIN" && (
            <Link href="/audit">
              <span className="lang-en">Audit Log</span>
              <span className="lang-zh">审计日志</span>
            </Link>
          )}

          <button
            type="button"
            className="sidebar-logout"
            onClick={logout}
          >
            <span className="lang-en">Logout</span>
            <span className="lang-zh">退出登录</span>
          </button>
        </nav>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
