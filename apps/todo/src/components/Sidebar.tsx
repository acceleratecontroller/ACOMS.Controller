"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

const baseNavItems = [
  { href: "/", label: "Dashboard", exact: true },
  { href: "/tasks", label: "Task Manager" },
  { href: "/materials", label: "Materials" },
  { href: "/job-creator", label: "Job Creator" },
  { href: "/diary", label: "Diary" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [showEmailDigest, setShowEmailDigest] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.emailDigest) setShowEmailDigest(true); })
      .catch(() => {});
  }, []);

  const navItems = [
    ...baseNavItems,
    ...(showEmailDigest ? [{ href: "/email-digest", label: "Email Digest" }] : []),
  ];

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-blue-700 dark:text-blue-400">ACOMS</span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="p-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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
          fixed md:sticky z-30 top-0 left-0 h-full md:h-screen
          w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-1 shrink-0 md:overflow-y-auto
          transform transition-transform duration-200 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        `}
      >
        <div className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-6 px-2">
          ACOMS Controller
        </div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive(item.href, item.exact)
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400"
            }`}
          >
            {item.label}
          </Link>
        ))}
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <Link
            href="/logout"
            className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400 transition-colors block"
          >
            Sign out
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
