import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { withPrismaError } from "@/lib/api-helpers";

// POST /api/notes/[id]/restore — Restore an archived note
export async function POST(
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

  const { result: note, error } = await withPrismaError("Failed to restore note", () =>
    prisma.quickNote.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedById: null,
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "QuickNote",
    entityId: note.id,
    action: "RESTORE",
    entityLabel: "Quick Note",
    performedById: session.user.id,
  });

  return NextResponse.json(note);
}
