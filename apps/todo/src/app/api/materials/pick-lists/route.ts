import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { createPickListSchema } from "@/modules/materials/validation";

export async function GET() {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { result: pickLists, error } = await withPrismaError("Failed to fetch pick lists", () =>
    prisma.pickList.findMany({
      where: { isArchived: false },
      include: {
        items: {
          include: {
            item: { select: { code: true, description: true, unitOfMeasure: true } },
          },
        },
        _count: { select: { items: true } },
      },
      orderBy: { name: "asc" },
    }),
  );
  if (error) return error;

  return NextResponse.json(pickLists);
}

export async function POST(request: NextRequest) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = createPickListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { result: pickList, error } = await withPrismaError("Failed to create pick list", () =>
    prisma.pickList.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        createdById: session.user.id,
        items: {
          create: parsed.data.items.map((i) => ({
            itemId: i.itemId,
            defaultQty: i.defaultQty,
          })),
        },
      },
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

  audit({
    entityType: "PickList",
    entityId: pickList.id,
    action: "CREATE",
    entityLabel: pickList.name,
    performedById: session.user.id,
  });

  return NextResponse.json(pickList, { status: 201 });
}
