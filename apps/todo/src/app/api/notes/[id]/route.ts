import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit, diff } from "@/lib/audit";
import { parseBody, withPrismaError } from "@/lib/api-helpers";

// PUT /api/notes/[id] — Update note content (auto-save)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;
  const { data: body, error: bodyError } = await parseBody<{ content?: string }>(request);
  if (bodyError) return bodyError;

  // Verify ownership
  const existing = await prisma.quickNote.findUnique({ where: { id } });
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { result: note, error } = await withPrismaError("Failed to update note", () =>
    prisma.quickNote.update({
      where: { id },
      data: {
        ...(body.content !== undefined && { content: body.content }),
      },
    }),
  );
  if (error) return error;

  const changes = diff(
    existing as unknown as Record<string, unknown>,
    note as unknown as Record<string, unknown>,
  );

  if (changes) {
    audit({
      entityType: "QuickNote",
      entityId: note.id,
      action: "UPDATE",
      entityLabel: "Quick Note",
      performedById: session.user.id,
      changes,
    });
  }

  return NextResponse.json(note);
}

// DELETE /api/notes/[id] — Archive a note
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { id } = await params;

  // Verify ownership
  const existing = await prisma.quickNote.findUnique({ where: { id } });
  if (!existing || existing.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { result: note, error } = await withPrismaError("Failed to archive note", () =>
    prisma.quickNote.update({
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
    entityType: "QuickNote",
    entityId: note.id,
    action: "ARCHIVE",
    entityLabel: "Quick Note",
    performedById: session.user.id,
  });

  return NextResponse.json(note);
}
