import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { approveJobRequestSchema } from "@/modules/job-creator/validation";
import { requireAuth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { pushJobToSheet, pushQuoteTabRow, pushConstructionTabRow } from "@/lib/google-sheets";
import { createServiceM8Job } from "@/lib/servicem8";
import { createSimProJob, createSimProQuote, simProCostCentreForDepot } from "@/lib/simpro";
import { getWipClients } from "@/lib/acoms-wip";
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
  // All are blocking — if any fail, approval does not proceed.
  // Retry: steps marked "success" in the prior integrationLog are
  // skipped so retries don't duplicate records in external systems.

  type IntegrationLogEntry = { status: string; error?: string; details?: Record<string, unknown> };
  const prior = (existing.integrationLog as Record<string, IntegrationLogEntry> | null) || {};
  const integrationLog: Record<string, IntegrationLogEntry> = {};

  // Shared data
  const contactParts = [
    existing.clientContactName,
    existing.clientContactPhone,
    existing.clientContactEmail,
  ].filter(Boolean);

  const jobReceivedDate = existing.jobReceivedDate
    ? new Date(existing.jobReceivedDate).toLocaleDateString("en-AU")
    : "";

  let hasErrors = false;

  // Combine project name + address for sheets (dedup if same)
  const projectName = existing.projectName.trim();
  const siteAddress = existing.address?.trim() || "";
  const projectNameAddress = siteAddress && siteAddress.toLowerCase() !== projectName.toLowerCase()
    ? `${projectName} - ${siteAddress}`
    : projectName;

  // 1a. Google Sheets — Data tab. Row number is needed by 1b.
  let sheetRow: number | undefined;
  if (prior.googleSheets?.status === "success") {
    integrationLog.googleSheets = prior.googleSheets;
    sheetRow = prior.googleSheets.details?.row as number | undefined;
  } else {
    try {
      const sheetResult = await pushJobToSheet({
        depot: DEPOT_LABELS[existing.depot] || existing.depot,
        client: existing.client,
        contract: existing.contract,
        initialStatus: finalJobType === "DIRECT_WORK_ORDER" ? "Work Order" : (JOB_TYPE_LABELS[finalJobType] || finalJobType),
        financePONumber: existing.financePONumber || "",
        clientReference: existing.clientReference || "",
        projectNameAddress,
        jobReceivedDate,
        clientContact: contactParts.join(" | "),
        jobCreationAndReview: jobReceivedDate,
      });
      sheetRow = sheetResult.row;
      integrationLog.googleSheets = {
        status: "success",
        details: { row: sheetResult.row, acomsNumber: sheetResult.acomsNumber },
      };
    } catch (err) {
      console.error("[approve] Google Sheets push failed:", err);
      hasErrors = true;
      integrationLog.googleSheets = {
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  // 1b. Google Sheets — Quote or Construction tab (needs sheetRow)
  const subTabKey = finalJobType === "QUOTE" ? "quoteTab" : "constructionTab";
  if (prior[subTabKey]?.status === "success") {
    integrationLog[subTabKey] = prior[subTabKey];
  } else if (sheetRow !== undefined) {
    try {
      const todayFormatted = new Date().toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });

      if (finalJobType === "QUOTE") {
        const quoteReceivedDate = existing.quoteReceivedDate
          ? new Date(existing.quoteReceivedDate).toLocaleDateString("en-AU")
          : "";
        const quoteDueDate = existing.quoteDueDate
          ? new Date(existing.quoteDueDate).toLocaleDateString("en-AU")
          : "";
        await pushQuoteTabRow(sheetRow, {
          quoteReceivedDate,
          originalQuoteDueDate: quoteDueDate,
          comments: `${todayFormatted} - New RFQ`,
        });
      } else {
        const workOrderReceivedDate = existing.workOrderReceivedDate
          ? new Date(existing.workOrderReceivedDate).toLocaleDateString("en-AU")
          : "";
        const workOrderDueDate = existing.workOrderDueDate
          ? new Date(existing.workOrderDueDate).toLocaleDateString("en-AU")
          : "";
        await pushConstructionTabRow(sheetRow, {
          jobReceivedDate: workOrderReceivedDate,
          originalDueDate: workOrderDueDate,
          comments: `${todayFormatted} - New Work Order`,
        });
      }
      integrationLog[subTabKey] = { status: "success", details: { row: sheetRow } };
    } catch (err) {
      console.error(`[approve] ${subTabKey} push failed:`, err);
      hasErrors = true;
      integrationLog[subTabKey] = {
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  // 2. ServiceM8 — Work Order or Quote (both create a job, different status)
  if (prior.serviceM8?.status === "success") {
    integrationLog.serviceM8 = prior.serviceM8;
  } else {
    try {
      const categoryName = `${existing.client} - ${existing.contract}`;
      const sm8Address = siteAddress || projectName;

      let companyName: string;
      if (finalJobType === "DIRECT_WORK_ORDER") {
        // Company name: "{Client Ref} - {Project Name}" (dedup if same)
        const clientRef = existing.clientReference?.trim() || "";
        companyName = clientRef && clientRef.toLowerCase() !== projectName.toLowerCase()
          ? `${clientRef} - ${projectName}`
          : projectName;
      } else {
        // Quotes: just the project name (+ address if different)
        companyName = projectNameAddress;
      }

      const sm8Result = await createServiceM8Job({
        companyName,
        jobAddress: sm8Address,
        categoryName,
        purchaseOrderNumber: existing.client,
        jobDescription: existing.emailContent || "",
        status: finalJobType === "DIRECT_WORK_ORDER" ? "Work Order" : "Quote",
      });
      integrationLog.serviceM8 = {
        status: "success",
        details: { jobUuid: sm8Result.jobUuid, categoryUuid: sm8Result.categoryUuid },
      };
    } catch (err) {
      console.error("[approve] ServiceM8 push failed:", err);
      hasErrors = true;
      integrationLog.serviceM8 = {
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  // 3. SimPRO — Work Order creates a Job, Quote creates a Quote
  if (prior.simPro?.status === "success") {
    integrationLog.simPro = prior.simPro;
  } else {
    try {
      // Look up the client's simproCustomerId from WIP
      const wipClients = await getWipClients();
      const wipClient = wipClients.find(
        (c) => c.name.toLowerCase() === existing.client.toLowerCase(),
      );
      const simproCustomerId = wipClient?.simproCustomerId;

      if (!simproCustomerId) {
        throw new Error(
          `No SimPRO customer ID mapped for client "${existing.client}". ` +
          `Set simproCustomerId on the client record in ACOMS.WIP.`,
        );
      }

      const costCenterId = simProCostCentreForDepot(existing.depot);

      // Site name: "{Client Ref} - {Project Name + Address}" (dedup if same)
      const simproClientRef = existing.clientReference?.trim() || "";
      const simproSiteName = simproClientRef && simproClientRef.toLowerCase() !== projectNameAddress.toLowerCase()
        ? `${simproClientRef} - ${projectNameAddress}`
        : projectNameAddress;

      if (finalJobType === "DIRECT_WORK_ORDER") {
        const simproResult = await createSimProJob({
          customerId: simproCustomerId,
          siteName: simproSiteName,
          description: existing.emailContent || "",
          orderNo: existing.clientReference || existing.financePONumber || "",
          costCenterId,
        });
        integrationLog.simPro = {
          status: "success",
          details: { jobId: simproResult.jobId, jobUrl: simproResult.jobUrl },
        };
      } else {
        const quoteDueDate = existing.quoteDueDate
          ? new Date(existing.quoteDueDate).toISOString().slice(0, 10)
          : undefined;
        const simproResult = await createSimProQuote({
          customerId: simproCustomerId,
          siteName: simproSiteName,
          description: existing.emailContent || "",
          dueDate: quoteDueDate,
          costCenterId,
        });
        integrationLog.simPro = {
          status: "success",
          details: { quoteId: simproResult.quoteId, quoteUrl: simproResult.quoteUrl },
        };
      }
    } catch (err) {
      console.error("[approve] SimPRO push failed:", err);
      hasErrors = true;
      integrationLog.simPro = {
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  // ─── Save integration log and handle result ───────────────

  if (hasErrors) {
    // Save the partial results so the UI can show what happened
    await prisma.jobRequest.update({
      where: { id },
      data: { integrationLog: integrationLog as unknown as Prisma.InputJsonValue },
    });

    const failedNames = Object.entries(integrationLog)
      .filter(([, v]) => v.status === "failed")
      .map(([k]) => k);

    return NextResponse.json(
      {
        error: `Approval blocked — failed: ${failedNames.join(", ")}`,
        integrationLog,
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
    integrationLog: integrationLog as unknown as Prisma.InputJsonValue,
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
