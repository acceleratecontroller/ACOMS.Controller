export interface DiaryEntry {
  id: string;
  type: "NOTE" | "EVENT" | "CONVERSATION";
  date: string;
  time: string | null;
  heading: string;
  people: string[];
  content: string;
  isImportant: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  archivedAt: string | null;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getMonthYearKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthYearLabel(key: string): string {
  const [year, month] = key.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
