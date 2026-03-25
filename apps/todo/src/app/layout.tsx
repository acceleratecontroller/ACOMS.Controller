import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACOMS Controller",
  description: "Tasks, Materials & More",
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
              ACOMS Controller
            </div>
            <NavLink href="/">Dashboard</NavLink>
            <NavLink href="/tasks">Task Manager</NavLink>

            <SectionHeader>Setup</SectionHeader>
            <NavLink href="/materials/items">Items</NavLink>
            <NavLink href="/materials/locations">Locations</NavLink>
            <NavLink href="/materials/suppliers">Suppliers</NavLink>
            <NavLink href="/materials/jobs">Jobs</NavLink>
            <NavLink href="/materials/pick-lists">Pick Lists</NavLink>
            <NavLink href="/materials/items/import">Import Items</NavLink>

            <SectionHeader>Inbound</SectionHeader>
            <NavLink href="/materials/movements/receive">Receive Stock</NavLink>

            <SectionHeader>Outbound</SectionHeader>
            <NavLink href="/materials/movements/return-to-supplier">Return to Supplier</NavLink>

            <SectionHeader>Internal</SectionHeader>
            <NavLink href="/materials/movements/transfer">Transfer</NavLink>

            <SectionHeader>Tracking</SectionHeader>
            <NavLink href="/materials/stock">Stock Levels</NavLink>
            <NavLink href="/materials/movements">Movement History</NavLink>
            <NavLink href="/materials/stocktakes">Stocktakes</NavLink>
          </nav>

          {/* Main content */}
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 mb-1 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
      {children}
    </div>
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
