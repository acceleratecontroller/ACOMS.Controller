import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { updatePickListSchema } from "@/modules/materials/validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { id } = await params;
  const { result: pickList, error } = await withPrismaError("Failed to fetch pick list", () =>
    prisma.pickList.findUniqueOrThrow({
      where: { id },
      include: {
        items: {
          include: {
            item: { select: { code: true, description: true, unitOfMeasure: true } },
          },
        },
      },
    }),
  );
  if (error) return error;

  return NextResponse.json(pickList);
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

  const parsed = updatePickListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Delete old items + update pick list atomically to avoid orphaned state
  const { result: pickList, error } = await withPrismaError("Failed to update pick list", () =>
    prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (parsed.data.items) {
        await tx.pickListItem.deleteMany({ where: { pickListId: id } });
      }

      return tx.pickList.update({
        where: { id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          ...(parsed.data.items && {
            items: {
              create: parsed.data.items.map((i) => ({
                itemId: i.itemId,
                defaultQty: i.defaultQty,
              })),
            },
          }),
        },
        include: {
          items: {
            include: {
              item: { select: { code: true, description: true, unitOfMeasure: true } },
            },
          },
        },
      });
    }),
  );
  if (error) return error;

  audit({
    entityType: "PickList",
    entityId: pickList.id,
    action: "UPDATE",
    entityLabel: pickList.name,
    performedById: session.user.id,
  });

  return NextResponse.json(pickList);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;
  const { result: pickList, error } = await withPrismaError("Failed to archive pick list", () =>
    prisma.pickList.update({
      where: { id },
      data: { isArchived: true },
    }),
  );
  if (error) return error;

  audit({
    entityType: "PickList",
    entityId: pickList.id,
    action: "ARCHIVE",
    entityLabel: pickList.name,
    performedById: session.user.id,
  });

  return NextResponse.json({ success: true });
}
