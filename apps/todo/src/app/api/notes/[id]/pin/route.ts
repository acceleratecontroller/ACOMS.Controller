import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { withPrismaError } from "@/lib/api-helpers";

// PUT /api/notes/[id]/pin — Toggle pin status
export async function PUT(
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

  const nowPinned = !existing.isPinned;

  const { result: note, error } = await withPrismaError("Failed to toggle pin", () =>
    prisma.quickNote.update({
      where: { id },
      data: {
        isPinned: nowPinned,
        pinnedAt: nowPinned ? new Date() : null,
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "QuickNote",
    entityId: note.id,
    action: nowPinned ? "PIN" : "UNPIN",
    entityLabel: "Quick Note",
    performedById: session.user.id,
  });

  return NextResponse.json(note);
}
