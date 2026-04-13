import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { approveJobRequestSchema } from "@/modules/job-creator/validation";
import { requireAuth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { pushJobToSheet } from "@/lib/google-sheets";
import { createServiceM8Job } from "@/lib/servicem8";
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

  // Determine the final job type (reviewer may have changed it)
  const finalJobType = parsed.data.jobType || existing.jobType;

  // ─── Run integrations BEFORE updating status ─────────────
  // Both are blocking — if either fails, approval does not proceed.

  const integrationResults: Record<string, unknown> = {};
  const integrationErrors: string[] = [];

  // Shared data
  const contactParts = [
    existing.clientContactName,
    existing.clientContactPhone,
    existing.clientContactEmail,
  ].filter(Boolean);

  const jobReceivedDate = existing.jobReceivedDate
    ? new Date(existing.jobReceivedDate).toLocaleDateString("en-AU")
    : "";

  // 1. Google Sheets (always)
  try {
    const sheetResult = await pushJobToSheet({
      depot: DEPOT_LABELS[existing.depot] || existing.depot,
      client: existing.client,
      contract: existing.contract,
      initialStatus: finalJobType === "DIRECT_WORK_ORDER" ? "Work Order" : (JOB_TYPE_LABELS[finalJobType] || finalJobType),
      financePONumber: existing.financePONumber || "",
      clientReference: existing.clientReference || "",
      projectNameAddress: existing.projectNameAddress,
      jobReceivedDate,
      clientContact: contactParts.join(" | "),
      jobCreationAndReview: jobReceivedDate,
    });
    integrationResults.googleSheets = { pushed: true, row: sheetResult.row, acomsNumber: sheetResult.acomsNumber };
  } catch (err) {
    console.error("[approve] Google Sheets push failed:", err);
    integrationErrors.push(`Google Sheets: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  // 2. ServiceM8 (only for Direct Work Orders)
  if (finalJobType === "DIRECT_WORK_ORDER") {
    try {
      // If client ref and project name/address are the same, don't repeat
      const clientRef = existing.clientReference?.trim() || "";
      const projectAddr = existing.projectNameAddress.trim();
      const companyName = clientRef && clientRef.toLowerCase() !== projectAddr.toLowerCase()
        ? `${clientRef} - ${projectAddr}`
        : projectAddr;

      const categoryName = `${existing.client} - ${existing.contract}`;

      const sm8Result = await createServiceM8Job({
        companyName: companyName || existing.projectNameAddress,
        jobAddress: existing.projectNameAddress,
        categoryName,
        purchaseOrderNumber: existing.client,
        jobDescription: existing.emailContent || "",
      });
      integrationResults.serviceM8 = { pushed: true, jobUuid: sm8Result.jobUuid };
    } catch (err) {
      console.error("[approve] ServiceM8 push failed:", err);
      integrationErrors.push(`ServiceM8: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  } else {
    integrationResults.serviceM8 = { skipped: true, reason: "Quotes are not pushed to ServiceM8" };
  }

  // ─── If any integration failed, block the approval ────────
  if (integrationErrors.length > 0) {
    return NextResponse.json(
      {
        error: "Approval blocked — one or more integrations failed",
        integrationErrors,
        integrationResults,
      },
      { status: 502 },
    );
  }

  // ─── All integrations succeeded — update status ───────────

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

  return NextResponse.json({
    ...job,
    _integrations: integrationResults,
  });
}
