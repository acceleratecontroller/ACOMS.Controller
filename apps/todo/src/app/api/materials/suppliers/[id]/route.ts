import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth, requireAdmin } from "@/lib/auth";
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
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

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

  // Cascade ownership changes to linked items when isFreeIssue or clientName changes
  const freeIssueChanged = parsed.data.isFreeIssue !== undefined && parsed.data.isFreeIssue !== before.isFreeIssue;
  const clientNameChanged = parsed.data.clientName !== undefined && parsed.data.clientName !== before.clientName;
  const needsCascade = freeIssueChanged || clientNameChanged;

  const { result: supplier, error } = await withPrismaError("Failed to update supplier", () =>
    prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.supplier.update({
        where: { id },
        data: parsed.data,
      });

      if (needsCascade) {
        const newOwnership = updated.isFreeIssue ? "CLIENT_FREE_ISSUE" : "COMPANY";
        const newClientName = updated.isFreeIssue ? (updated.clientName || null) : null;

        await tx.item.updateMany({
          where: { supplierId: id, isArchived: false },
          data: {
            ownershipType: newOwnership as never,
            clientName: newClientName,
          },
        });
      }

      return updated;
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
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

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
