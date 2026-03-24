import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { updateStocktakeLineSchema } from "@/modules/materials/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { result: stocktake, error } = await withPrismaError("Failed to fetch stocktake", () =>
    prisma.stocktake.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        location: { select: { name: true } },
        lines: {
          include: {
            item: { select: { code: true, description: true, unitOfMeasure: true } },
            movement: { select: { id: true, quantity: true } },
          },
          orderBy: { item: { code: "asc" } },
        },
      },
    }),
  );
  if (error) return error;

  return NextResponse.json(stocktake);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check stocktake is still DRAFT
  const { result: stocktake, error: fetchErr } = await withPrismaError("Failed to fetch stocktake", () =>
    prisma.stocktake.findUniqueOrThrow({ where: { id: params.id } }),
  );
  if (fetchErr) return fetchErr;

  if (stocktake.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Cannot edit a completed stocktake" },
      { status: 400 },
    );
  }

  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  // Body is an array of line updates: [{ lineId, countedQty, notes }]
  const lines = body as Array<{ lineId: string; countedQty: number; notes?: string }>;

  if (!Array.isArray(lines)) {
    return NextResponse.json({ error: "Expected array of line updates" }, { status: 400 });
  }

  for (const line of lines) {
    const parsed = updateStocktakeLineSchema.safeParse(line);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Validation failed for line ${line.lineId}`, details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    await prisma.stocktakeLine.update({
      where: { id: line.lineId },
      data: {
        countedQty: parsed.data.countedQty,
        notes: parsed.data.notes,
      },
    });
  }

  // Return updated stocktake
  const { result: updated, error } = await withPrismaError("Failed to fetch stocktake", () =>
    prisma.stocktake.findUniqueOrThrow({
      where: { id: params.id },
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

  return NextResponse.json(updated);
}
