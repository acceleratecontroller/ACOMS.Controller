"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navGroups = [
  {
    label: "Setup",
    items: [
      { href: "/materials/items", label: "Items" },
      { href: "/materials/locations", label: "Locations" },
      { href: "/materials/suppliers", label: "Suppliers" },
      { href: "/materials/jobs", label: "Jobs" },
      { href: "/materials/pick-lists", label: "Pick Lists" },
      { href: "/materials/items/import", label: "Import Items" },
    ],
  },
  {
    label: "Inbound",
    items: [
      { href: "/materials/movements/receive", label: "Receive Stock" },
    ],
  },
  {
    label: "Outbound",
    items: [
      { href: "/materials/movements/return-to-supplier", label: "Return to Supplier" },
    ],
  },
  {
    label: "Internal",
    items: [
      { href: "/materials/movements/transfer", label: "Transfer" },
    ],
  },
  {
    label: "Tracking",
    items: [
      { href: "/materials/stock", label: "Stock Levels" },
      { href: "/materials/movements", label: "Movement History" },
      { href: "/materials/stocktakes", label: "Stocktakes" },
    ],
  },
];

export default function MaterialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLanding = pathname === "/materials";

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Secondary horizontal nav - shown on sub-pages, hidden on landing */}
      {!isLanding && (
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-1 overflow-x-auto">
          <Link
            href="/materials"
            className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-500 hover:text-blue-700 hover:bg-blue-50 transition-colors shrink-0"
          >
            &larr; Materials
          </Link>
          <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />
          {navGroups.map((group) =>
            group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {item.label}
              </Link>
            ))
          )}
        </div>
      )}

      {/* Page content */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
