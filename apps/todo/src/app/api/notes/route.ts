import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { withPrismaError } from "@/lib/api-helpers";

// GET /api/notes — List current user's notes
export async function GET(request: NextRequest) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const showArchived = request.nextUrl.searchParams.get("archived") === "true";

  const notes = await prisma.quickNote.findMany({
    where: {
      createdById: session.user.id,
      isArchived: showArchived,
    },
    orderBy: [
      { isPinned: "desc" },
      { updatedAt: "desc" },
    ],
  });

  return NextResponse.json(notes);
}

// POST /api/notes — Create a new quick note
export async function POST() {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const { result: note, error } = await withPrismaError("Failed to create note", () =>
    prisma.quickNote.create({
      data: {
        createdById: session.user.id,
      },
    }),
  );
  if (error) return error;

  audit({
    entityType: "QuickNote",
    entityId: note.id,
    action: "CREATE",
    entityLabel: "Quick Note",
    performedById: session.user.id,
  });

  return NextResponse.json(note, { status: 201 });
}
