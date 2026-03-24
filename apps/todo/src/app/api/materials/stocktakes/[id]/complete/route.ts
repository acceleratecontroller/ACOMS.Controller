import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withPrismaError } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { result: stocktake, error: fetchErr } = await withPrismaError("Failed to fetch stocktake", () =>
    prisma.stocktake.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        location: { select: { name: true } },
        lines: {
          include: { item: { select: { code: true, description: true } } },
        },
      },
    }),
  );
  if (fetchErr) return fetchErr;

  if (stocktake.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Stocktake is already completed" },
      { status: 400 },
    );
  }

  const adjustments: { lineId: string; movementId: string; variance: number }[] = [];

  for (const line of stocktake.lines) {
    const expected = Number(line.expectedQty);
    const counted = Number(line.countedQty);
    const variance = counted - expected;

    if (variance === 0) continue;

    const { result: movement, error } = await withPrismaError(
      `Failed to create adjustment for ${line.item.code}`,
      () =>
        prisma.stockMovement.create({
          data: {
            itemId: line.itemId,
            quantity: Math.abs(variance),
            movementType: "ADJUSTED",
            ownershipType: "COMPANY",
            toLocationId: variance > 0 ? stocktake.locationId : null,
            fromLocationId: variance < 0 ? stocktake.locationId : null,
            reference: `Stocktake #${stocktake.id.slice(0, 8)}`,
            notes: `Stocktake adjustment: expected ${expected}, counted ${counted} (variance: ${variance > 0 ? "+" : ""}${variance})`,
            createdById: session.user.id,
          },
        }),
    );
    if (error) return error;

    await prisma.stocktakeLine.update({
      where: { id: line.id },
      data: { movementId: movement.id },
    });

    adjustments.push({ lineId: line.id, movementId: movement.id, variance });
  }

  const { result: completed, error } = await withPrismaError("Failed to complete stocktake", () =>
    prisma.stocktake.update({
      where: { id: params.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      include: {
        location: { select: { name: true } },
        lines: {
          include: {
            item: { select: { code: true, description: true, unitOfMeasure: true } },
            movement: { select: { id: true, quantity: true, movementType: true } },
          },
          orderBy: { item: { code: "asc" } },
        },
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "Stocktake",
    entityId: completed.id,
    action: "UPDATE",
    entityLabel: `Stocktake at ${completed.location.name} — completed`,
    performedById: session.user.id,
    changes: {
      status: { from: "DRAFT", to: "COMPLETED" },
      adjustments: { from: null, to: adjustments.length },
    },
  });

  return NextResponse.json({
    stocktake: completed,
    adjustmentsCreated: adjustments.length,
    adjustments,
  });
}
