import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { withPrismaError } from "@/lib/api-helpers";
import * as XLSX from "xlsx";

const UOM_LABELS: Record<string, string> = {
  EACH: "ea",
  METRE: "m",
  ROLL: "roll",
  KILOGRAM: "kg",
  LITRE: "L",
  BOX: "box",
  PACK: "pk",
  LENGTH: "len",
  SET: "set",
  OTHER: "other",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { id } = await params;
  const { result: stocktake, error } = await withPrismaError("Failed to fetch stocktake", () =>
    prisma.stocktake.findUniqueOrThrow({
      where: { id },
      include: {
        location: { select: { name: true } },
        lines: {
          include: {
            item: { select: { code: true, description: true, unitOfMeasure: true } },
          },
          orderBy: { item: { code: "asc" } },
        },
      },
    }),
  );

  if (error) return error;
  if (!stocktake) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (stocktake.status !== "COMPLETED") {
    return NextResponse.json({ error: "Only completed stocktakes can be exported" }, { status: 400 });
  }

  const rows = stocktake.lines.map((line) => {
    const expected = Number(line.expectedQty);
    const counted = Number(line.countedQty);
    const variance = counted - expected;
    return {
      "Item Code": line.item.code,
      "Description": line.item.description,
      "UOM": UOM_LABELS[line.item.unitOfMeasure] || line.item.unitOfMeasure,
      "Expected Qty": expected,
      "Counted Qty": counted,
      "Variance": variance,
      "Notes": line.notes || "",
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws["!cols"] = [
    { wch: 16 }, // Item Code
    { wch: 40 }, // Description
    { wch: 8 },  // UOM
    { wch: 14 }, // Expected Qty
    { wch: 14 }, // Counted Qty
    { wch: 12 }, // Variance
    { wch: 30 }, // Notes
  ];

  const locationName = stocktake.location.name;
  const completedDate = stocktake.completedAt
    ? new Date(stocktake.completedAt).toLocaleDateString("en-AU")
    : "";

  XLSX.utils.book_append_sheet(wb, ws, "Stocktake");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const filename = `Stocktake_${locationName.replace(/[^a-zA-Z0-9]/g, "_")}_${completedDate.replace(/\//g, "-")}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
