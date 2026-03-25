import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { createItemSchema } from "@/modules/materials/validation";

export async function GET(request: NextRequest) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const archived = searchParams.get("archived") === "true";
  const search = searchParams.get("search") || undefined;

  const supplierId = searchParams.get("supplierId") || undefined;
  const category = searchParams.get("category") || undefined;
  const ownershipType = searchParams.get("ownershipType") || undefined;

  const where: Record<string, unknown> = { isArchived: archived };
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
      { aliases: { has: search } },
    ];
  }
  if (supplierId) where.supplierId = supplierId;
  if (category) where.category = category;
  if (ownershipType) where.ownershipType = ownershipType;

  const { result: items, error } = await withPrismaError("Failed to fetch items", () =>
    prisma.item.findMany({
      where,
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { code: "asc" },
    }),
  );
  if (error) return error;

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Derive ownership from supplier
  let ownershipType = "COMPANY";
  let clientName: string | null = null;
  if (parsed.data.supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: parsed.data.supplierId } });
    if (supplier?.isFreeIssue) {
      ownershipType = "CLIENT_FREE_ISSUE";
      clientName = supplier.clientName;
    }
  }

  const { result: item, error } = await withPrismaError("Failed to create item", () =>
    prisma.item.create({
      data: {
        ...parsed.data,
        ownershipType: ownershipType as never,
        clientName,
        createdById: session.user.id,
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "Item",
    entityId: item.id,
    action: "CREATE",
    entityLabel: `${item.code} — ${item.description}`,
    performedById: session.user.id,
  });

  return NextResponse.json(item, { status: 201 });
}
