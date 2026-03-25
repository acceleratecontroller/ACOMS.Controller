import Link from "next/link";

const sections = [
  {
    title: "Setup",
    description: "Configure your materials, locations, and suppliers",
    items: [
      { href: "/materials/items", label: "Items", description: "Manage your inventory items" },
      { href: "/materials/locations", label: "Locations", description: "Storage locations and areas" },
      { href: "/materials/suppliers", label: "Suppliers", description: "Supplier directory" },
      { href: "/materials/jobs", label: "Jobs", description: "Job tracking and materials allocation" },
      { href: "/materials/pick-lists", label: "Pick Lists", description: "Create and manage pick lists" },
      { href: "/materials/items/import", label: "Import Items", description: "Bulk import items from file" },
    ],
  },
  {
    title: "Inbound",
    description: "Receiving materials into inventory",
    items: [
      { href: "/materials/movements/receive", label: "Receive Stock", description: "Log incoming deliveries" },
    ],
  },
  {
    title: "Outbound",
    description: "Sending materials out",
    items: [
      { href: "/materials/movements/return-to-supplier", label: "Return to Supplier", description: "Process supplier returns" },
    ],
  },
  {
    title: "Internal",
    description: "Move materials between locations",
    items: [
      { href: "/materials/movements/transfer", label: "Transfer", description: "Transfer stock between locations" },
    ],
  },
  {
    title: "Tracking",
    description: "Monitor stock levels and history",
    items: [
      { href: "/materials/stock", label: "Stock Levels", description: "Current inventory quantities" },
      { href: "/materials/movements", label: "Movement History", description: "Full audit trail of all movements" },
      { href: "/materials/stocktakes", label: "Stocktakes", description: "Physical inventory counts" },
    ],
  },
];

export default function MaterialsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Materials</h1>
      <p className="text-gray-500 mb-8">
        Manage inventory, track stock movements, and maintain supplier relationships.
      </p>

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {section.title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <div className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                    {item.label}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {item.description}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
