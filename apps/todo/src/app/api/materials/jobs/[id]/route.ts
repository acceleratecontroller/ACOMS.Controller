import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withPrismaError } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { result: job, error } = await withPrismaError("Failed to fetch job", () =>
    prisma.job.findUniqueOrThrow({
      where: { id },
      include: {
        movements: {
          include: {
            item: { select: { code: true, description: true, unitOfMeasure: true } },
            fromLocation: { select: { id: true, name: true } },
            toLocation: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        materials: {
          include: {
            item: { select: { id: true, code: true, description: true, unitOfMeasure: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
  );
  if (error) return error;

  // Build received qty per item from movements
  const receivedByItem = new Map<string, number>();
  for (const m of job.movements) {
    const itemId = m.itemId;
    receivedByItem.set(itemId, (receivedByItem.get(itemId) || 0) + Number(m.quantity));
  }

  // Enrich materials with derived received qty (read-only computation)
  const enrichedMaterials = job.materials.map((mat) => {
    const receivedQty = receivedByItem.get(mat.itemId) || 0;
    const requiredQty = Number(mat.requiredQty);
    const outstanding = Math.max(0, requiredQty - receivedQty);

    return {
      ...mat,
      requiredQty,
      receivedQty,
      outstanding,
      // Compute effective status for response (DB is updated on movement creation)
      status: (receivedQty >= requiredQty && mat.status !== "FULFILLED") ? "FULFILLED" : mat.status,
    };
  });

  // Build item summary from movements (keyed by itemId)
  const materialItemIds = new Set(job.materials.map((m) => m.itemId));
  const itemMap = new Map<string, { itemId: string; code: string; description: string; unitOfMeasure: string; received: number; movementCount: number; alreadyInRequirements: boolean }>();
  for (const m of job.movements) {
    const existing = itemMap.get(m.itemId) || { itemId: m.itemId, code: m.item.code, description: m.item.description, unitOfMeasure: m.item.unitOfMeasure, received: 0, movementCount: 0, alreadyInRequirements: materialItemIds.has(m.itemId) };
    existing.received += Number(m.quantity);
    existing.movementCount++;
    itemMap.set(m.itemId, existing);
  }

  return NextResponse.json({
    ...job,
    materials: enrichedMaterials,
    summary: {
      totalReceived: job.movements.reduce((sum, m) => sum + Number(m.quantity), 0),
      movementCount: job.movements.length,
    },
    itemSummary: Array.from(itemMap.values()),
  });
}
