import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { audit, diff } from "@/lib/audit";
import { updateLocationSchema } from "@/modules/materials/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { result: location, error } = await withPrismaError("Failed to fetch location", () =>
    prisma.location.findUniqueOrThrow({ where: { id: params.id } }),
  );
  if (error) return error;

  return NextResponse.json(location);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = updateLocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { result: before, error: fetchErr } = await withPrismaError("Failed to fetch location", () =>
    prisma.location.findUniqueOrThrow({ where: { id: params.id } }),
  );
  if (fetchErr) return fetchErr;

  const { result: location, error } = await withPrismaError("Failed to update location", () =>
    prisma.location.update({
      where: { id: params.id },
      data: parsed.data,
    }),
  );
  if (error) return error;

  const changes = diff(
    before as unknown as Record<string, unknown>,
    parsed.data as unknown as Record<string, unknown>,
  );
  if (changes) {
    audit({
      entityType: "Location",
      entityId: location.id,
      action: "UPDATE",
      entityLabel: location.name,
      performedById: session.user.id,
      changes,
    });
  }

  return NextResponse.json(location);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { result: location, error } = await withPrismaError("Failed to archive location", () =>
    prisma.location.update({
      where: { id: params.id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedById: session.user.id,
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "Location",
    entityId: location.id,
    action: "ARCHIVE",
    entityLabel: location.name,
    performedById: session.user.id,
  });

  return NextResponse.json({ success: true });
}
