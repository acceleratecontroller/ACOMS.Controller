import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { withPrismaError } from "@/lib/api-helpers";

// POST /api/job-creator/[id]/submit — Submit draft for review
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { id } = await params;
  const existing = await prisma.jobRequest.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft job requests can be submitted for review" },
      { status: 400 },
    );
  }

  const { result: job, error } = await withPrismaError("Failed to submit job request", () =>
    prisma.jobRequest.update({
      where: { id },
      data: { status: "PENDING_REVIEW" },
    }),
  );
  if (error) return error;

  audit({
    entityType: "JobRequest",
    entityId: job.id,
    action: "UPDATE",
    entityLabel: `${job.acomsNumber} — ${job.client}`,
    performedById: session.user.id,
    changes: { status: { from: "DRAFT", to: "PENDING_REVIEW" } },
  });

  return NextResponse.json(job);
}
