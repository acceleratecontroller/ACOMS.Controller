import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { createDiaryEntrySchema } from "@/modules/diary/validation";

// GET /api/diary — List current user's diary entries
export async function GET(request: NextRequest) {
  const { session, error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const sp = request.nextUrl.searchParams;
  const showArchived = sp.get("archived") === "true";
  const typeFilter = sp.get("type");
  const search = sp.get("search");
  const person = sp.get("person");
  const from = sp.get("from");
  const to = sp.get("to");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    createdById: session.user.id,
    isArchived: showArchived,
  };

  if (typeFilter && ["NOTE", "EVENT", "CONVERSATION"].includes(typeFilter)) {
    where.type = typeFilter;
  }

  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.date.lte = toDate;
    }
  }

  if (person) {
    where.people = { has: person };
  }

  if (search) {
    where.OR = [
      { heading: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
      { people: { has: search } },
    ];
  }

  const entries = await prisma.diaryEntry.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(entries);
}

// POST /api/diary — Create a new diary entry
export async function POST(request: NextRequest) {
  const { session, error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { data: body, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;

  const parsed = createDiaryEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { result: entry, error } = await withPrismaError("Failed to create diary entry", () =>
    prisma.diaryEntry.create({
      data: {
        type: parsed.data.type,
        date: new Date(parsed.data.date),
        heading: parsed.data.heading,
        people: parsed.data.people,
        content: parsed.data.content || "",
        isImportant: parsed.data.isImportant,
        createdById: session.user.id,
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "DiaryEntry",
    entityId: entry.id,
    action: "CREATE",
    entityLabel: entry.heading,
    performedById: session.user.id,
  });

  return NextResponse.json(entry, { status: 201 });
}
