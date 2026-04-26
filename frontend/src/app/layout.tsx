import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import LanguageToggle from "@/components/LanguageToggle";

export const metadata: Metadata = {
  title: "Smart Inventory ERP",
  description: "Inventory, expiry, and waste analytics dashboard"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <h2>Smart Inventory ERP</h2>
            <LanguageToggle />
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
            </nav>
          </aside>

          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}