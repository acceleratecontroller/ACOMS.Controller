import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { audit, diff } from "@/lib/audit";
import { updateSupplierSchema } from "@/modules/materials/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { result: supplier, error } = await withPrismaError("Failed to fetch supplier", () =>
    prisma.supplier.findUniqueOrThrow({
      where: { id },
      include: {
        items: {
          where: { isArchived: false },
          include: { supplier: { select: { id: true, name: true } } },
          orderBy: { code: "asc" },
        },
      },
    }),
  );
  if (error) return error;

  return NextResponse.json(supplier);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = updateSupplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { result: before, error: fetchErr } = await withPrismaError("Failed to fetch supplier", () =>
    prisma.supplier.findUniqueOrThrow({ where: { id } }),
  );
  if (fetchErr) return fetchErr;

  const { result: supplier, error } = await withPrismaError("Failed to update supplier", () =>
    prisma.supplier.update({
      where: { id },
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
      entityType: "Supplier",
      entityId: supplier.id,
      action: "UPDATE",
      entityLabel: supplier.name,
      performedById: session.user.id,
      changes,
    });
  }

  return NextResponse.json(supplier);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { result: supplier, error } = await withPrismaError("Failed to archive supplier", () =>
    prisma.supplier.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedById: session.user.id,
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "Supplier",
    entityId: supplier.id,
    action: "ARCHIVE",
    entityLabel: supplier.name,
    performedById: session.user.id,
  });

  return NextResponse.json({ success: true });
}
