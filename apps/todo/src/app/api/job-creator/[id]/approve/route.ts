import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { approveJobRequestSchema } from "@/modules/job-creator/validation";
import { requireAuth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseBody, withPrismaError } from "@/lib/api-helpers";

// POST /api/job-creator/[id]/approve — Approve a pending job request
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
      { error: "Only pending job requests can be approved" },
      { status: 400 },
    );
  }

  // Reviewer may optionally change the job type
  const { data: body, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;

  const parsed = approveJobRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const changes: Record<string, { from: unknown; to: unknown }> = {
    status: { from: "PENDING_REVIEW", to: "APPROVED" },
  };

  const updateData: Record<string, unknown> = {
    status: "APPROVED",
    reviewedById: session.user.id,
    reviewedAt: new Date(),
  };

  if (parsed.data.jobType && parsed.data.jobType !== existing.jobType) {
    updateData.jobType = parsed.data.jobType;
    changes.jobType = { from: existing.jobType, to: parsed.data.jobType };
  }

  const { result: job, error } = await withPrismaError("Failed to approve job request", () =>
    prisma.jobRequest.update({ where: { id }, data: updateData }),
  );
  if (error) return error;

  audit({
    entityType: "JobRequest",
    entityId: job.id,
    action: "UPDATE",
    entityLabel: `${job.acomsNumber} — ${job.client}`,
    performedById: session.user.id,
    changes,
  });

  return NextResponse.json(job);
}
