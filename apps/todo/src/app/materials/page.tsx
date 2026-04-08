"use client";

import Link from "next/link";
import { useState } from "react";

const primaryItems = [
  { href: "/materials/items", label: "Items", description: "Manage your inventory items" },
  { href: "/materials/jobs", label: "Jobs", description: "Job tracking and materials allocation" },
  { href: "/materials/movements/receive", label: "Receive Stock", description: "Log incoming deliveries" },
];

const otherItems = [
  { href: "/materials/locations", label: "Locations", description: "Storage locations and areas" },
  { href: "/materials/suppliers", label: "Suppliers", description: "Supplier directory" },
  { href: "/materials/pick-lists", label: "Pick Lists", description: "Create and manage pick lists" },
  { href: "/materials/items/import", label: "Import Items", description: "Bulk import items from file" },
  { href: "/materials/movements/return-to-supplier", label: "Return to Supplier", description: "Process supplier returns" },
  { href: "/materials/movements/transfer", label: "Transfer", description: "Transfer stock between locations" },
  { href: "/materials/stock", label: "Stock Levels", description: "Current inventory quantities" },
  { href: "/materials/movements", label: "Movement History", description: "Full audit trail of all movements" },
  { href: "/materials/stocktakes", label: "Stocktakes", description: "Physical inventory counts" },
];

export default function MaterialsPage() {
  const [otherOpen, setOtherOpen] = useState(false);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Materials</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Manage inventory, track stock movements, and maintain supplier relationships.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {primaryItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-700 transition-colors">
              {item.label}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {item.description}
            </div>
          </Link>
        ))}
      </div>

      <div>
        <button
          onClick={() => setOtherOpen(!otherOpen)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${otherOpen ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Other ({otherItems.length})
        </button>

        {otherOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
            {otherItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-700 transition-colors">
                  {item.label}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {item.description}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
