import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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

            <nav>
              <Link href="/">Dashboard</Link>
              <Link href="/products">Products</Link>
              <Link href="/inventory">Inventory</Link>
              <Link href="/expiring-products">Expiring Products</Link>
              <Link href="/waste-analytics">Waste Analytics</Link>
            </nav>
          </aside>

          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}