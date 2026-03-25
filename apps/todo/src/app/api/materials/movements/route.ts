import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { createMovementSchema } from "@/modules/materials/validation";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const needsToLocation = ["RECEIVED", "RECEIVED_FREE_ISSUE", "RETURNED_FROM_JOB", "ADJUSTED"];
  const needsFromLocation = ["ISSUED", "RETURNED_TO_SUPPLIER"];
  const needsBothLocations = ["TRANSFERRED"];

  if (needsToLocation.includes(data.movementType) && !data.toLocationId) {
    return NextResponse.json(
      { error: "To location is required for this movement type" },
      { status: 400 },
    );
  }
  if (needsFromLocation.includes(data.movementType) && !data.fromLocationId) {
    return NextResponse.json(
      { error: "From location is required for this movement type" },
      { status: 400 },
    );
  }
  if (needsBothLocations.includes(data.movementType)) {
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

  const ownershipType = data.movementType === "RECEIVED_FREE_ISSUE"
    ? "CLIENT_FREE_ISSUE" as const
    : data.ownershipType || "COMPANY" as const;

  const { result: movement, error } = await withPrismaError("Failed to create movement", () =>
    prisma.stockMovement.create({
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
    }),
  );
  if (error) return error;

  return NextResponse.json(movement, { status: 201 });
}
