import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateJobRequestSchema } from "@/modules/job-creator/validation";
import { requireAuth } from "@/lib/auth";
import { audit, diff } from "@/lib/audit";
import { parseBody, withPrismaError } from "@/lib/api-helpers";

// GET /api/job-creator/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { id } = await params;
  const job = await prisma.jobRequest.findUnique({ where: { id } });

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}

// PUT /api/job-creator/[id] — Update a draft job request
export async function PUT(
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
  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft job requests can be edited" },
      { status: 400 },
    );
  }

  const { data: body, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;

  const parsed = updateJobRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const { result: job, error } = await withPrismaError("Failed to update job request", () =>
    prisma.jobRequest.update({
      where: { id },
      data: {
        ...(data.depot !== undefined && { depot: data.depot }),
        ...(data.client !== undefined && { client: data.client }),
        ...(data.contract !== undefined && { contract: data.contract }),
        ...(data.jobType !== undefined && { jobType: data.jobType }),
        ...(data.financePONumber !== undefined && { financePONumber: data.financePONumber || null }),
        ...(data.clientReference !== undefined && { clientReference: data.clientReference || null }),
        ...(data.projectNameAddress !== undefined && { projectNameAddress: data.projectNameAddress }),
        ...(data.jobReceivedDate !== undefined && { jobReceivedDate: new Date(data.jobReceivedDate!) }),
        ...(data.clientContactName !== undefined && { clientContactName: data.clientContactName || null }),
        ...(data.clientContactPhone !== undefined && { clientContactPhone: data.clientContactPhone || null }),
        ...(data.clientContactEmail !== undefined && { clientContactEmail: data.clientContactEmail || null }),
        ...(data.emailContent !== undefined && { emailContent: data.emailContent || null }),
      },
    }),
  );
  if (error) return error;

  const changes = diff(
    existing as unknown as Record<string, unknown>,
    job as unknown as Record<string, unknown>,
  );

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
