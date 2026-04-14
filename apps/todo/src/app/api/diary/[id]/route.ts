import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { audit, diff } from "@/lib/audit";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { updateDiaryEntrySchema } from "@/modules/diary/validation";

// GET /api/diary/[id] — Get a single diary entry
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { id } = await params;

  const entry = await prisma.diaryEntry.findUnique({ where: { id } });
  if (!entry || entry.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(entry);
}

// PUT /api/diary/[id] — Update a diary entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { id } = await params;
  const { data: body, error: bodyError } = await parseBody(request);
  if (bodyError) return bodyError;

  const parsed = updateDiaryEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // Verify ownership
  const existing = await prisma.diaryEntry.findUnique({ where: { id } });
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
  if (parsed.data.date !== undefined) updateData.date = new Date(parsed.data.date);
  if (parsed.data.time !== undefined) updateData.time = parsed.data.time || null;
  if (parsed.data.heading !== undefined) updateData.heading = parsed.data.heading;
  if (parsed.data.people !== undefined) updateData.people = parsed.data.people;
  if (parsed.data.content !== undefined) updateData.content = parsed.data.content;
  if (parsed.data.isImportant !== undefined) updateData.isImportant = parsed.data.isImportant;

  const { result: entry, error } = await withPrismaError("Failed to update diary entry", () =>
    prisma.diaryEntry.update({
      where: { id },
      data: updateData,
    }),
  );
  if (error) return error;

  const changes = diff(
    existing as unknown as Record<string, unknown>,
    entry as unknown as Record<string, unknown>,
  );

  if (changes) {
    audit({
      entityType: "DiaryEntry",
      entityId: entry.id,
      action: "UPDATE",
      entityLabel: entry.heading,
      performedById: session.user.id,
      changes,
    });
  }

  return NextResponse.json(entry);
}

// DELETE /api/diary/[id] — Archive a diary entry
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.diaryEntry.findUnique({ where: { id } });
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { result: entry, error } = await withPrismaError("Failed to archive diary entry", () =>
    prisma.diaryEntry.update({
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
    entityType: "DiaryEntry",
    entityId: entry.id,
    action: "ARCHIVE",
    entityLabel: entry.heading,
    performedById: session.user.id,
  });

  return NextResponse.json(entry);
}
