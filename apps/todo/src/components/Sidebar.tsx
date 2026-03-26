"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", exact: true },
  { href: "/tasks", label: "Task Manager" },
  { href: "/materials", label: "Materials" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-blue-700">ACOMS</span>
        <button
          onClick={() => setOpen(!open)}
          className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar nav - always visible on desktop, slide-in on mobile */}
      <nav
        className={`
          fixed md:static z-30 top-0 left-0 h-full
          w-56 bg-white border-r border-gray-200 p-4 flex flex-col gap-1 shrink-0
          transform transition-transform duration-200 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        `}
      >
        <div className="text-lg font-bold text-blue-700 mb-6 px-2">
          ACOMS Controller
        </div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive(item.href, item.exact)
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
