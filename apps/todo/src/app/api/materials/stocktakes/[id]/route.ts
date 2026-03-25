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

  const lines = body as Array<{ lineId: string; countedQty: number; notes?: string }>;

  if (!Array.isArray(lines)) {
    return NextResponse.json({ error: "Expected array of line updates" }, { status: 400 });
  }

  // Validate all lines before writing any — fail fast on bad input
  const validatedLines: { lineId: string; countedQty: number; notes?: string | null }[] = [];
  for (const line of lines) {
    const parsed = updateStocktakeLineSchema.safeParse(line);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Validation failed for line ${line.lineId}`, details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    validatedLines.push({ lineId: line.lineId, ...parsed.data });
  }

  // Apply all line updates atomically
  await prisma.$transaction(
    validatedLines.map((vl) =>
      prisma.stocktakeLine.update({
        where: { id: vl.lineId },
        data: {
          countedQty: vl.countedQty,
          notes: vl.notes,
        },
      }),
    ),
  );

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
