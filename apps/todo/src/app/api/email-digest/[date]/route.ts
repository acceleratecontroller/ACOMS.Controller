import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { WINDOW_DISPLAY_ORDER } from "@/modules/email-digest/constants";

export const dynamic = "force-dynamic";

// GET /api/email-digest/[date] — Full digest for a specific date
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { session, error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const ownerId = process.env.EMAIL_DIGEST_OWNER_ID;
  if (!ownerId || session.user.identityId !== ownerId) {
    return NextResponse.json({ digest: null });
  }

  const { date } = await params;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  const digest = await prisma.emailDigest.findUnique({
    where: { date },
    include: {
      windows: {
        include: {
          items: {
            orderBy: [{ tier: "asc" }, { position: "asc" }],
          },
        },
      },
    },
  });

  if (!digest) {
    return NextResponse.json({ digest: null });
  }

  // Sort windows by display order (newest first)
  const sortedWindows = [...digest.windows].sort(
    (a, b) => WINDOW_DISPLAY_ORDER.indexOf(a.windowType) - WINDOW_DISPLAY_ORDER.indexOf(b.windowType),
  );

  return NextResponse.json({
    digest: {
      id: digest.id,
      date: digest.date,
      windows: sortedWindows.map((w) => ({
        id: w.id,
        windowType: w.windowType,
        windowStart: w.windowStart,
        windowEnd: w.windowEnd,
        totalEmails: w.totalEmails,
        threadCount: w.threadCount,
        continuingThreads: w.continuingThreads,
        actionRequired: w.actionRequired,
        rawSummary: w.rawSummary,
        lastIngestedAt: w.lastIngestedAt.toISOString(),
        items: w.items.map((item) => ({
          id: item.id,
          tier: item.tier,
          position: item.position,
          sender: item.sender,
          senderEmail: item.senderEmail,
          subject: item.subject,
          folder: item.folder,
          receivedAt: item.receivedAt?.toISOString() ?? null,
          threadSize: item.threadSize,
          hasAttachment: item.hasAttachment,
          summary: item.summary,
          actionNeeded: item.actionNeeded,
          needsResponse: item.needsResponse,
          draftResponse: item.draftResponse,
          draftContext: item.draftContext,
          isActioned: item.isActioned,
          actionedAt: item.actionedAt?.toISOString() ?? null,
          isCarriedForward: item.isCarriedForward,
          carriedFromWindow: item.carriedFromWindow,
          isDeadline: item.isDeadline,
          deadlineDate: item.deadlineDate?.toISOString() ?? null,
          convertedToTaskId: item.convertedToTaskId,
        })),
      })),
    },
  });
}
