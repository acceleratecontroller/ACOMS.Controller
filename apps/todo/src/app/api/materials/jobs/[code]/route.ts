import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;

  const movements = await prisma.stockMovement.findMany({
    where: { projectCode: code },
    include: {
      item: { select: { code: true, description: true, unitOfMeasure: true } },
      fromLocation: { select: { id: true, name: true } },
      toLocation: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (movements.length === 0) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const totalIssued = movements
    .filter((m: { movementType: string }) => m.movementType === "ISSUED")
    .reduce((sum: number, m: { quantity: unknown }) => sum + Number(m.quantity), 0);

  const totalReturned = movements
    .filter((m: { movementType: string }) => m.movementType === "RETURNED_FROM_JOB")
    .reduce((sum: number, m: { quantity: unknown }) => sum + Number(m.quantity), 0);

  // Get unique items with net quantities
  const itemMap = new Map<string, { code: string; description: string; unitOfMeasure: string; issued: number; returned: number }>();
  for (const m of movements) {
    const key = m.item.code;
    const existing = itemMap.get(key) || { code: m.item.code, description: m.item.description, unitOfMeasure: m.item.unitOfMeasure, issued: 0, returned: 0 };
    if (m.movementType === "ISSUED") existing.issued += Number(m.quantity);
    if (m.movementType === "RETURNED_FROM_JOB") existing.returned += Number(m.quantity);
    itemMap.set(key, existing);
  }

  const itemSummary = Array.from(itemMap.values()).map((i) => ({
    ...i,
    net: i.issued - i.returned,
  }));

  return NextResponse.json({
    projectCode: code,
    projectName: movements[0].projectName,
    clientName: movements[0].clientName,
    summary: {
      totalIssued,
      totalReturned,
      netIssued: totalIssued - totalReturned,
    },
    itemSummary,
    movements,
  });
}
