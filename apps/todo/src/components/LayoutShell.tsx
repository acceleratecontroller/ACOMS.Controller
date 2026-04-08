"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEmbed = pathname.startsWith("/embed");

  if (isEmbed) {
    return <main className="w-full min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 p-4 md:p-8 pt-16 md:pt-8">{children}</main>
    </div>
  );
}
