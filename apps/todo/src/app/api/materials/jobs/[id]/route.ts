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
      },
    }),
  );
  if (error) return error;

  // Build item summary from movements
  const itemMap = new Map<string, { code: string; description: string; unitOfMeasure: string; received: number; movementCount: number }>();
  for (const m of job.movements) {
    const key = m.item.code;
    const existing = itemMap.get(key) || { code: m.item.code, description: m.item.description, unitOfMeasure: m.item.unitOfMeasure, received: 0, movementCount: 0 };
    existing.received += Number(m.quantity);
    existing.movementCount++;
    itemMap.set(key, existing);
  }

  const itemSummary = Array.from(itemMap.values());

  return NextResponse.json({
    ...job,
    summary: {
      totalReceived: job.movements.reduce((sum, m) => sum + Number(m.quantity), 0),
      movementCount: job.movements.length,
    },
    itemSummary,
  });
}
