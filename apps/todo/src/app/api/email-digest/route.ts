import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { WINDOW_DISPLAY_ORDER } from "@/modules/email-digest/constants";

export const dynamic = "force-dynamic";

function todayDateString(): string {
  const formatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${year}-${month}-${day}`;
}

// GET /api/email-digest — Query today's digest for the dashboard
export async function GET(request: NextRequest) {
  const { session, error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const ownerId = process.env.EMAIL_DIGEST_OWNER_ID;
  if (!ownerId || session.user.identityId !== ownerId) {
    return NextResponse.json({ digest: null, stats: null });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || todayDateString();
  const unactioned = searchParams.get("unactioned") === "true";

  const digest = await prisma.emailDigest.findUnique({
    where: { date },
    include: {
      windows: {
        include: {
          items: {
            where: unactioned ? { isActioned: false } : undefined,
            orderBy: [{ tier: "asc" }, { position: "asc" }],
          },
        },
      },
    },
  });

  if (!digest) {
    return NextResponse.json({ digest: null, stats: null });
  }

  // Sort windows by display order (newest first)
  const sortedWindows = [...digest.windows].sort(
    (a, b) => WINDOW_DISPLAY_ORDER.indexOf(a.windowType) - WINDOW_DISPLAY_ORDER.indexOf(b.windowType),
  );

  // Compute stats
  const allItems = digest.windows.flatMap((w) => w.items);
  const stats = {
    totalActionRequired: allItems.filter((i) => i.tier === "TIER_1_ACTION").length,
    totalUnactioned: allItems.filter((i) => !i.isActioned).length,
    totalDraftsReady: allItems.filter((i) => i.needsResponse && i.draftResponse).length,
    windowsCompleted: digest.windows.length,
  };

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
        actionRequired: w.actionRequired,
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
          isCarriedForward: item.isCarriedForward,
          isDeadline: item.isDeadline,
          deadlineDate: item.deadlineDate?.toISOString() ?? null,
          convertedToTaskId: item.convertedToTaskId,
        })),
      })),
    },
    stats,
  });
}
