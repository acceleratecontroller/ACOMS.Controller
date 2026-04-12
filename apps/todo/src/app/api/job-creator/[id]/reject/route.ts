import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rejectJobRequestSchema } from "@/modules/job-creator/validation";
import { requireAuth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseBody, withPrismaError } from "@/lib/api-helpers";

// POST /api/job-creator/[id]/reject — Reject a pending job request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { id } = await params;
  const existing = await prisma.jobRequest.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "PENDING_REVIEW") {
    return NextResponse.json(
      { error: "Only pending job requests can be rejected" },
      { status: 400 },
    );
  }

  const { data: body, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;

  const parsed = rejectJobRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { result: job, error } = await withPrismaError("Failed to reject job request", () =>
    prisma.jobRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: parsed.data.rejectionReason,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        isArchived: true,
        archivedAt: new Date(),
        archivedById: session.user.id,
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "JobRequest",
    entityId: job.id,
    action: "UPDATE",
    entityLabel: `${job.acomsNumber} — ${job.client}`,
    performedById: session.user.id,
    changes: {
      status: { from: "PENDING_REVIEW", to: "REJECTED" },
      rejectionReason: { from: null, to: parsed.data.rejectionReason },
    },
  });

  return NextResponse.json(job);
}
