import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { createStocktakeSchema } from "@/modules/materials/validation";
import { getStockAtLocation } from "@/lib/stock";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { result: stocktakes, error } = await withPrismaError("Failed to fetch stocktakes", () =>
    prisma.stocktake.findMany({
      include: {
        location: { select: { name: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  );
  if (error) return error;

  return NextResponse.json(stocktakes);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = createStocktakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const items = await prisma.item.findMany({
    where: { isArchived: false },
    orderBy: { code: "asc" },
  });

  const linesData = await Promise.all(
    items.map(async (item) => {
      const expectedQty = await getStockAtLocation(item.id, parsed.data.locationId);
      return {
        itemId: item.id,
        expectedQty,
        countedQty: 0,
      };
    }),
  );

  const { result: stocktake, error } = await withPrismaError("Failed to create stocktake", () =>
    prisma.stocktake.create({
      data: {
        locationId: parsed.data.locationId,
        notes: parsed.data.notes,
        createdById: session.user.id,
        lines: {
          create: linesData,
        },
      },
      include: {
        location: { select: { name: true } },
        lines: {
          include: { item: { select: { code: true, description: true, unitOfMeasure: true } } },
          orderBy: { item: { code: "asc" } },
        },
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "Stocktake",
    entityId: stocktake.id,
    action: "CREATE",
    entityLabel: `Stocktake at ${stocktake.location.name}`,
    performedById: session.user.id,
  });

  return NextResponse.json(stocktake, { status: 201 });
}
