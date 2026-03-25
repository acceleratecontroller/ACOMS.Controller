import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { createSupplierSchema } from "@/modules/materials/validation";

export async function GET(request: NextRequest) {
  const { error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { searchParams } = new URL(request.url);
  const archived = searchParams.get("archived") === "true";
  const search = searchParams.get("search") || undefined;

  const where: Record<string, unknown> = { isArchived: archived };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
    ];
  }

  const { result: suppliers, error } = await withPrismaError("Failed to fetch suppliers", () =>
    prisma.supplier.findMany({
      where,
      include: { _count: { select: { items: true } } },
      orderBy: { name: "asc" },
    }),
  );
  if (error) return error;

  return NextResponse.json(suppliers);
}

export async function POST(request: NextRequest) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = createSupplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { result: supplier, error } = await withPrismaError("Failed to create supplier", () =>
    prisma.supplier.create({
      data: {
        ...parsed.data,
        createdById: session.user.id,
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "Supplier",
    entityId: supplier.id,
    action: "CREATE",
    entityLabel: supplier.name,
    performedById: session.user.id,
  });

  return NextResponse.json(supplier, { status: 201 });
}
