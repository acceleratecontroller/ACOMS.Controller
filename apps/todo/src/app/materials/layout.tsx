"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const primaryLinks = [
  { href: "/materials/items", label: "Items" },
  { href: "/materials/jobs", label: "Jobs" },
  { href: "/materials/movements/receive", label: "Receive Stock" },
  { href: "/materials/stock", label: "Stock Levels" },
  { href: "/materials/client-returns", label: "Returns" },
  { href: "/materials/stocktakes", label: "Stocktakes" },
];

const otherLinks = [
  { href: "/materials/locations", label: "Locations" },
  { href: "/materials/suppliers", label: "Suppliers" },
  { href: "/materials/pick-lists", label: "Pick Lists" },
  { href: "/materials/items/import", label: "Import Items" },
  { href: "/materials/movements/return-to-supplier", label: "Return to Supplier" },
  { href: "/materials/movements/transfer", label: "Transfer" },
  { href: "/materials/movements", label: "Movement History" },
];

export default function MaterialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLanding = pathname === "/materials";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const isOtherActive = otherLinks.some((item) => isActive(item.href));

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close dropdown on navigation
  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  return (
    <div className="flex flex-col h-full">
      {!isLanding && (
        <div className="relative bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-2 md:px-4 py-2 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          <Link
            href="/materials"
            className="px-2 md:px-3 py-1.5 rounded-md text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors shrink-0"
          >
            &larr; <span className="hidden sm:inline">Materials</span>
          </Link>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1 shrink-0" />

          {primaryLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors shrink-0 ${
                isActive(item.href)
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Other dropdown */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`px-2 md:px-3 py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors flex items-center gap-1 ${
                isOtherActive
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400"
              }`}
            >
              Other
              <svg
                className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute top-full right-0 md:left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 min-w-[200px]">
                {otherLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-4 py-2 text-sm transition-colors ${
                      isActive(item.href)
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-400"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1">{children}</div>
    </div>
  );
}
