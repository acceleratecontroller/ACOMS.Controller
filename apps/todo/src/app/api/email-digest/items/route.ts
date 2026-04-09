import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/email-digest/items — Cowork checks actioned items before building "still unanswered" section
// Auth: API key (machine-to-machine), same as ingest endpoint
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.EMAIL_DIGEST_API_KEY;

  if (!expectedKey || !authHeader || authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const actioned = searchParams.get("actioned");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date query param required (YYYY-MM-DD)" }, { status: 400 });
  }

  const where: Record<string, unknown> = {
    window: { digest: { date } },
  };

  if (actioned === "true") {
    where.isActioned = true;
  } else if (actioned === "false") {
    where.isActioned = false;
  }

  const items = await prisma.emailDigestItem.findMany({
    where,
    select: {
      id: true,
      sender: true,
      senderEmail: true,
      subject: true,
      tier: true,
      isActioned: true,
      actionedAt: true,
      convertedToTaskId: true,
      window: {
        select: { windowType: true },
      },
    },
    orderBy: [{ tier: "asc" }, { position: "asc" }],
  });

  return NextResponse.json({ items });
}
