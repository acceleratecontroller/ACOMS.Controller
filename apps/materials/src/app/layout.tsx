import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACOMS Controller — Material Tracker",
  description: "Stock, Movements & Material Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <nav className="w-56 bg-white border-r border-gray-200 p-4 flex flex-col gap-1">
            <div className="text-lg font-bold text-blue-700 mb-6 px-2">
              Material Tracker
            </div>
            <NavLink href="/">Dashboard</NavLink>
            <NavLink href="/items">Items</NavLink>
            <NavLink href="/locations">Locations</NavLink>
            <div className="mt-3 mb-1 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Movements
            </div>
            <NavLink href="/movements">History</NavLink>
            <NavLink href="/movements/receive">Receive</NavLink>
            <NavLink href="/movements/issue">Issue to Job</NavLink>
            <NavLink href="/movements/transfer">Transfer</NavLink>
            <NavLink href="/movements/return">Return</NavLink>
            <div className="mt-3 mb-1 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Stock
            </div>
            <NavLink href="/stock">Stock Levels</NavLink>
            <NavLink href="/stocktakes">Stocktakes</NavLink>
            <div className="mt-3 mb-1 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Tools
            </div>
            <NavLink href="/pick-lists">Pick Lists</NavLink>
            <NavLink href="/items/import">Import Items</NavLink>
          </nav>

          {/* Main content */}
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
    >
      {children}
    </Link>
  );
}
