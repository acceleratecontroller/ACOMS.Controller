import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/diary/people — Get distinct people tags for autocomplete
export async function GET() {
  const { session, error: authErr } = await requireAuth();
  if (authErr) return authErr;

  // Fetch all non-archived entries for this user and collect unique people
  const entries = await prisma.diaryEntry.findMany({
    where: {
      createdById: session.user.id,
      isArchived: false,
    },
    select: { people: true },
  });

  const peopleSet = new Set<string>();
  for (const entry of entries) {
    for (const person of entry.people) {
      peopleSet.add(person);
    }
  }

  const people = Array.from(peopleSet).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  return NextResponse.json(people);
}
