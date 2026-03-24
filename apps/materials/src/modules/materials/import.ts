import { importItemRowSchema } from "./validation";

export interface ImportResult {
  success: number;
  errors: { row: number; message: string }[];
  items: ParsedItem[];
}

export interface ParsedItem {
  code: string;
  description: string;
  category?: string;
  unitOfMeasure: string;
  aliases: string[];
  minimumStockLevel?: number;
  notes?: string;
}

/**
 * Parse CSV text into validated item rows.
 * Expects headers: code, description, category, unitOfMeasure, aliases, minimumStockLevel, notes
 */
export function parseItemsCsv(csvText: string): ImportResult {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    return { success: 0, errors: [{ row: 0, message: "File is empty or has no data rows" }], items: [] };
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const codeIdx = headers.indexOf("code");
  const descIdx = headers.indexOf("description");
  const catIdx = headers.indexOf("category");
  const uomIdx = headers.indexOf("unitofmeasure");
  const aliasIdx = headers.indexOf("aliases");
  const minIdx = headers.indexOf("minimumstocklevel");
  const notesIdx = headers.indexOf("notes");

  if (codeIdx === -1 || descIdx === -1) {
    return {
      success: 0,
      errors: [{ row: 0, message: "CSV must have 'code' and 'description' columns" }],
      items: [],
    };
  }

  const items: ParsedItem[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.every((c) => c.trim() === "")) continue;

    const raw = {
      code: cols[codeIdx]?.trim() ?? "",
      description: cols[descIdx]?.trim() ?? "",
      category: catIdx >= 0 ? cols[catIdx]?.trim() || undefined : undefined,
      unitOfMeasure: uomIdx >= 0 ? cols[uomIdx]?.trim().toUpperCase() || undefined : undefined,
      aliases: aliasIdx >= 0 ? cols[aliasIdx]?.trim() || undefined : undefined,
      minimumStockLevel: minIdx >= 0 && cols[minIdx]?.trim() ? Number(cols[minIdx].trim()) : undefined,
      notes: notesIdx >= 0 ? cols[notesIdx]?.trim() || undefined : undefined,
    };

    const parsed = importItemRowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({
        row: i + 1,
        message: parsed.error.issues.map((e) => e.message).join("; "),
      });
      continue;
    }

    items.push({
      code: parsed.data.code,
      description: parsed.data.description,
      category: parsed.data.category,
      unitOfMeasure: parsed.data.unitOfMeasure ?? "EACH",
      aliases: parsed.data.aliases ? parsed.data.aliases.split("|").map((a) => a.trim()).filter(Boolean) : [],
      minimumStockLevel: parsed.data.minimumStockLevel,
      notes: parsed.data.notes,
    });
  }

  return { success: items.length, errors, items };
}

/**
 * Simple CSV line parser that handles quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
