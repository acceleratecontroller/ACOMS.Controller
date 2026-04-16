import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createJobRequestSchema } from "@/modules/job-creator/validation";
import { requireAuth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseBody, withPrismaError } from "@/lib/api-helpers";

/** Generate the next JR-XXXX acoms number. */
async function nextAcomsNumber(): Promise<string> {
  const last = await prisma.jobRequest.findFirst({
    orderBy: { acomsNumber: "desc" },
    select: { acomsNumber: true },
  });
  const seq = last ? parseInt(last.acomsNumber.replace("JR-", ""), 10) + 1 : 1;
  return `JR-${String(seq).padStart(4, "0")}`;
}

// GET /api/job-creator — List job requests
export async function GET(request: NextRequest) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  const depot = sp.get("depot");
  const search = sp.get("search");
  const showArchived = sp.get("archived") === "true";

  const where: Record<string, unknown> = { isArchived: showArchived };
  if (status) where.status = status;
  if (depot) where.depot = depot;
  if (search) {
    where.OR = [
      { client: { contains: search, mode: "insensitive" } },
      { projectName: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
      { acomsNumber: { contains: search, mode: "insensitive" } },
      { clientReference: { contains: search, mode: "insensitive" } },
    ];
  }

  const jobs = await prisma.jobRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(jobs);
}

// POST /api/job-creator — Create a new job request
export async function POST(request: NextRequest) {
  const { session, error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { data: body, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;

  const parsed = createJobRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const acomsNumber = await nextAcomsNumber();

  const { result: job, error } = await withPrismaError("Failed to create job request", () =>
    prisma.jobRequest.create({
      data: {
        acomsNumber,
        depot: data.depot,
        client: data.client,
        contract: data.contract,
        jobType: data.jobType,
        financePONumber: data.financePONumber || null,
        clientReference: data.clientReference || null,
        projectName: data.projectName,
        address: data.address || null,
        jobReceivedDate: new Date(data.jobReceivedDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        clientContactName: data.clientContactName || null,
        clientContactPhone: data.clientContactPhone || null,
        clientContactEmail: data.clientContactEmail || null,
        emailContent: data.emailContent || null,
        status: "DRAFT",
        createdById: session.user.id,
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "JobRequest",
    entityId: job.id,
    action: "CREATE",
    entityLabel: `${job.acomsNumber} — ${job.client}`,
    performedById: session.user.id,
  });

  return NextResponse.json(job, { status: 201 });
}
