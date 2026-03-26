import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import {
  createMovementSchema,
  MOVEMENT_NEEDS_TO_LOCATION,
  MOVEMENT_NEEDS_FROM_LOCATION,
  MOVEMENT_NEEDS_BOTH_LOCATIONS,
} from "@/modules/materials/validation";

export async function GET(request: NextRequest) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId") || undefined;
  const movementType = searchParams.get("movementType") || undefined;
  const locationId = searchParams.get("locationId") || undefined;
  const clientName = searchParams.get("clientName") || undefined;
  const projectCode = searchParams.get("projectCode") || undefined;
  const limit = parseInt(searchParams.get("limit") || "100", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const where: Record<string, unknown> = {};
  if (itemId) where.itemId = itemId;
  if (movementType) where.movementType = movementType;
  if (clientName) where.clientName = { contains: clientName, mode: "insensitive" };
  if (projectCode) where.projectCode = { contains: projectCode, mode: "insensitive" };
  if (locationId) {
    where.OR = [
      { fromLocationId: locationId },
      { toLocationId: locationId },
    ];
  }

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        item: { select: { code: true, description: true, unitOfMeasure: true } },
        fromLocation: { select: { id: true, name: true } },
        toLocation: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return NextResponse.json({ movements, total, limit, offset });
}

export async function POST(request: NextRequest) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = createMovementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Validate movement type has correct location fields
  if (MOVEMENT_NEEDS_TO_LOCATION.includes(data.movementType) && !data.toLocationId) {
    return NextResponse.json(
      { error: "To location is required for this movement type" },
      { status: 400 },
    );
  }
  if (MOVEMENT_NEEDS_FROM_LOCATION.includes(data.movementType) && !data.fromLocationId) {
    return NextResponse.json(
      { error: "From location is required for this movement type" },
      { status: 400 },
    );
  }
  if (MOVEMENT_NEEDS_BOTH_LOCATIONS.includes(data.movementType)) {
    if (!data.fromLocationId || !data.toLocationId) {
      return NextResponse.json(
        { error: "Both from and to locations are required for transfers" },
        { status: 400 },
      );
    }
    if (data.fromLocationId === data.toLocationId) {
      return NextResponse.json(
        { error: "From and to locations must be different for transfers" },
        { status: 400 },
      );
    }
  }

  // Validate job exists if provided
  if (data.jobId) {
    const jobExists = await prisma.job.findUnique({ where: { id: data.jobId } });
    if (!jobExists) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 400 },
      );
    }
    // Guard against archived jobs (safe access in case migration hasn't run)
    if ("isArchived" in jobExists && jobExists.isArchived) {
      return NextResponse.json(
        { error: "Cannot receive stock against an archived job" },
        { status: 400 },
      );
    }
  }

  const ownershipType = data.movementType === "RECEIVED_FREE_ISSUE"
    ? "CLIENT_FREE_ISSUE" as const
    : data.ownershipType || "COMPANY" as const;

  // Create movement + auto-fulfill in a single transaction
  const { result: movement, error } = await withPrismaError("Failed to create movement", () =>
    prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.stockMovement.create({
        data: {
          itemId: data.itemId,
          quantity: data.quantity,
          movementType: data.movementType,
          ownershipType,
          fromLocationId: data.fromLocationId,
          toLocationId: data.toLocationId,
          clientName: data.clientName,
          externalClientId: data.externalClientId,
          projectName: data.projectName,
          projectCode: data.projectCode,
          externalProjectId: data.externalProjectId,
          externalSource: data.externalSource,
          sourceType: data.sourceType,
          sourceName: data.sourceName,
          jobId: data.jobId,
          reference: data.reference,
          notes: data.notes,
          attachmentPlaceholder: data.attachmentPlaceholder,
          createdById: session.user.id,
        },
        include: {
          item: { select: { code: true, description: true } },
          fromLocation: { select: { name: true } },
          toLocation: { select: { name: true } },
        },
      });

      // Auto-fulfill: when a movement is linked to a job, check if the item's
      // material requirement is now met and update status accordingly.
      if (data.jobId) {
        const jobMaterial = await tx.jobMaterial.findUnique({
          where: { jobId_itemId: { jobId: data.jobId, itemId: data.itemId } },
        });

        if (jobMaterial && jobMaterial.status !== "FULFILLED") {
          const agg = await tx.stockMovement.aggregate({
            where: { jobId: data.jobId, itemId: data.itemId },
            _sum: { quantity: true },
          });
          const totalReceived = Number(agg._sum.quantity ?? 0);

          if (totalReceived >= Number(jobMaterial.requiredQty)) {
            await tx.jobMaterial.update({
              where: { id: jobMaterial.id },
              data: { status: "FULFILLED" },
            });
          }
        }
      }

      return created;
    }),
  );
  if (error) return error;

  return NextResponse.json(movement, { status: 201 });
}
