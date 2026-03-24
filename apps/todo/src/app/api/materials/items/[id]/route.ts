import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { audit, diff } from "@/lib/audit";
import { updateItemSchema } from "@/modules/materials/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { result: item, error } = await withPrismaError("Failed to fetch item", () =>
    prisma.item.findUniqueOrThrow({ where: { id: params.id } }),
  );
  if (error) return error;

  return NextResponse.json(item);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { result: before, error: fetchErr } = await withPrismaError("Failed to fetch item", () =>
    prisma.item.findUniqueOrThrow({ where: { id: params.id } }),
  );
  if (fetchErr) return fetchErr;

  // Derive ownership from supplier
  const updateData = { ...parsed.data };
  const supplierId = updateData.supplierId !== undefined ? updateData.supplierId : before.supplierId;
  if (supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (supplier) {
      updateData.ownershipType = supplier.isFreeIssue ? "CLIENT_FREE_ISSUE" : "COMPANY";
      updateData.clientName = supplier.isFreeIssue ? (supplier.clientName || null) : null;
    }
  } else {
    updateData.ownershipType = "COMPANY";
    updateData.clientName = null;
  }

  const { result: item, error } = await withPrismaError("Failed to update item", () =>
    prisma.item.update({
      where: { id: params.id },
      data: updateData,
    }),
  );
  if (error) return error;

  const changes = diff(
    before as unknown as Record<string, unknown>,
    parsed.data as unknown as Record<string, unknown>,
  );
  if (changes) {
    audit({
      entityType: "Item",
      entityId: item.id,
      action: "UPDATE",
      entityLabel: `${item.code} — ${item.description}`,
      performedById: session.user.id,
      changes,
    });
  }

  return NextResponse.json(item);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { result: item, error } = await withPrismaError("Failed to archive item", () =>
    prisma.item.update({
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
    entityType: "Item",
    entityId: item.id,
    action: "ARCHIVE",
    entityLabel: `${item.code} — ${item.description}`,
    performedById: session.user.id,
  });

  return NextResponse.json({ success: true });
}
