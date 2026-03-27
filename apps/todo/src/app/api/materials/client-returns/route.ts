import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const jobId = searchParams.get("jobId") || undefined;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (jobId) where.jobId = jobId;

  const returns = await prisma.clientReturn.findMany({
    where,
    include: {
      item: { select: { id: true, code: true, description: true, unitOfMeasure: true } },
      job: { select: { id: true, projectId: true, name: true, client: true } },
      location: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(returns);
}
