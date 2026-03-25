"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", exact: true },
  { href: "/tasks", label: "Task Manager" },
  { href: "/materials", label: "Materials" },
];

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="w-56 bg-white border-r border-gray-200 p-4 flex flex-col gap-1 shrink-0">
      <div className="text-lg font-bold text-blue-700 mb-6 px-2">
        ACOMS Controller
      </div>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
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
  );
}
