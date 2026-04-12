import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { approveJobRequestSchema } from "@/modules/job-creator/validation";
import { requireAuth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { pushJobToSheet } from "@/lib/google-sheets";
import { DEPOT_LABELS, JOB_TYPE_LABELS } from "@/modules/job-creator/constants";

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

  // Push to WIP Google Sheet (non-blocking — don't fail approval if sheet push fails)
  let sheetResult: { row: number; acomsNumber: string | null } | null = null;
  let sheetError: string | null = null;

  try {
    const contactParts = [
      job.clientContactName,
      job.clientContactPhone,
      job.clientContactEmail,
    ].filter(Boolean);

    const jobReceivedDate = job.jobReceivedDate
      ? new Date(job.jobReceivedDate).toLocaleDateString("en-AU")
      : "";

    const reviewLine = [
      `Created by ${session.user.name || session.user.email || session.user.id}`,
      `Approved ${new Date().toLocaleDateString("en-AU")}`,
    ].join(" | ");

    sheetResult = await pushJobToSheet({
      depot: DEPOT_LABELS[job.depot] || job.depot,
      client: job.client,
      contract: job.contract,
      initialStatus: JOB_TYPE_LABELS[job.jobType] || job.jobType,
      financePONumber: job.financePONumber || "",
      clientReference: job.clientReference || "",
      projectNameAddress: job.projectNameAddress,
      jobReceivedDate,
      clientContact: contactParts.join(" | "),
      jobCreationAndReview: reviewLine,
    });
  } catch (err) {
    console.error("[approve] Google Sheets push failed:", err);
    sheetError = err instanceof Error ? err.message : "Unknown error";
  }

  return NextResponse.json({
    ...job,
    _sheet: sheetResult
      ? { pushed: true, row: sheetResult.row, acomsNumber: sheetResult.acomsNumber }
      : { pushed: false, error: sheetError },
  });
}
