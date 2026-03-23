import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACOMS Controller — To-Do",
  description: "Shared To-Do and Recurring Tasks",
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
            <NavLink href="/tasks">Tasks</NavLink>
            <NavLink href="/categories">Categories</NavLink>
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
