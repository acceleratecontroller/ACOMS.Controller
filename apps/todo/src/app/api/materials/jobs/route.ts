import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  // Get all movements that have a project code (these are job-related)
  const where: Record<string, unknown> = {
    projectCode: { not: null },
  };

  if (search) {
    where.OR = [
      { projectCode: { contains: search, mode: "insensitive" } },
      { projectName: { contains: search, mode: "insensitive" } },
      { clientName: { contains: search, mode: "insensitive" } },
    ];
    // Remove the top-level projectCode filter since OR handles it
    delete where.projectCode;
    // Ensure we still only get movements with a project code
    where.AND = [
      { projectCode: { not: null } },
      { OR: where.OR },
    ];
    delete where.OR;
  }

  const movements = await prisma.stockMovement.findMany({
    where,
    select: {
      projectCode: true,
      projectName: true,
      clientName: true,
      movementType: true,
      quantity: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Aggregate into unique jobs
  const jobMap = new Map<string, {
    projectCode: string;
    projectName: string | null;
    clientName: string | null;
    totalIssued: number;
    totalReturned: number;
    movementCount: number;
    lastActivity: Date;
  }>();

  for (const m of movements) {
    const code = m.projectCode!;
    const existing = jobMap.get(code);
    const qty = Number(m.quantity);

    if (existing) {
      existing.movementCount++;
      if (m.movementType === "ISSUED") existing.totalIssued += qty;
      if (m.movementType === "RETURNED_FROM_JOB") existing.totalReturned += qty;
      if (m.createdAt > existing.lastActivity) existing.lastActivity = m.createdAt;
      // Use the most recent non-null values for name/client
      if (m.projectName && !existing.projectName) existing.projectName = m.projectName;
      if (m.clientName && !existing.clientName) existing.clientName = m.clientName;
    } else {
      jobMap.set(code, {
        projectCode: code,
        projectName: m.projectName,
        clientName: m.clientName,
        totalIssued: m.movementType === "ISSUED" ? qty : 0,
        totalReturned: m.movementType === "RETURNED_FROM_JOB" ? qty : 0,
        movementCount: 1,
        lastActivity: m.createdAt,
      });
    }
  }

  const jobs = Array.from(jobMap.values())
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
    .map((j) => ({
      ...j,
      netIssued: j.totalIssued - j.totalReturned,
    }));

  return NextResponse.json(jobs);
}
