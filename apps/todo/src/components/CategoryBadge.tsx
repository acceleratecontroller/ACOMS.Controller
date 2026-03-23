"use client";

export function CategoryBadge({
  name,
  color,
}: {
  name: string;
  color: string | null;
}) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white"
      style={{ backgroundColor: color ?? "#6b7280" }}
    >
      {name}
    </span>
  );
}
