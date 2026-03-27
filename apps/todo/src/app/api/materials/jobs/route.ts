import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { createJobSchema } from "@/modules/materials/validation";

export async function GET(request: NextRequest) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const archived = searchParams.get("archived") === "true";

  const hasStock = searchParams.get("hasStock");

  const where: Record<string, unknown> = { isArchived: archived };
  if (search) {
    where.OR = [
      { projectId: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { client: { contains: search, mode: "insensitive" } },
    ];
  }

  if (hasStock === "true") {
    // Jobs that have at least one material requirement OR at least one received movement
    where.AND = [
      {
        OR: [
          { materials: { some: {} } },
          { movements: { some: {} } },
        ],
      },
    ];
  } else if (hasStock === "false") {
    // Jobs that have NO material requirements AND NO received movements
    where.AND = [
      { materials: { none: {} } },
      { movements: { none: {} } },
    ];
  }

  // Try with isArchived filter first; fall back without it if migration hasn't run yet
  let jobs;
  const { result, error } = await withPrismaError("Failed to fetch jobs", () =>
    prisma.job.findMany({
      where,
      include: {
        _count: { select: { movements: true, materials: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  );

  if (error) {
    // Likely isArchived column doesn't exist yet — retry without the filter
    delete where.isArchived;
    const { result: fallback, error: fallbackErr } = await withPrismaError("Failed to fetch jobs", () =>
      prisma.job.findMany({
        where,
        include: {
          _count: { select: { movements: true, materials: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    );
    if (fallbackErr) return fallbackErr;
    jobs = fallback;
  } else {
    jobs = result;
  }

  return NextResponse.json(jobs);
}

export async function POST(request: NextRequest) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = createJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { result: job, error } = await withPrismaError("Failed to create job", () =>
    prisma.job.create({
      data: {
        ...parsed.data,
        createdById: session.user.id,
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "Job",
    entityId: job.id,
    action: "CREATE",
    entityLabel: `${job.projectId} — ${job.name}`,
    performedById: session.user.id,
  });

  return NextResponse.json(job, { status: 201 });
}
