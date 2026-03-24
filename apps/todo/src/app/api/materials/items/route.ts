import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { createItemSchema } from "@/modules/materials/validation";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const archived = searchParams.get("archived") === "true";
  const search = searchParams.get("search") || undefined;

  const where: Record<string, unknown> = { isArchived: archived };
  if (search) {
    where.OR = [
      { code: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
      { aliases: { has: search } },
    ];
  }

  const { result: items, error } = await withPrismaError("Failed to fetch items", () =>
    prisma.item.findMany({
      where,
      orderBy: { code: "asc" },
    }),
  );
  if (error) return error;

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { result: item, error } = await withPrismaError("Failed to create item", () =>
    prisma.item.create({
      data: {
        ...parsed.data,
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
