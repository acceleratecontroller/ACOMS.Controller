import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { emailDigestIngestSchema } from "@/modules/email-digest/validation";

export const dynamic = "force-dynamic";

// POST /api/email-digest/ingest — Cowork pushes structured digest data here
export async function POST(request: NextRequest) {
  // Machine-to-machine auth via API key (not session auth)
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.EMAIL_DIGEST_API_KEY;

  if (!expectedKey || !authHeader || authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Simple rate limit: no more than 8 windows per day
  const ownerId = process.env.EMAIL_DIGEST_OWNER_ID;
  if (!ownerId) {
    return NextResponse.json({ error: "EMAIL_DIGEST_OWNER_ID not configured" }, { status: 500 });
  }

  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = emailDigestIngestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Rate limit check: max 8 windows per day
  const existingWindowCount = await prisma.emailDigestWindow.count({
    where: { digest: { date: input.date } },
  });
  // Allow re-ingests of existing window types, but cap total unique windows
  if (existingWindowCount >= 8) {
    const existingWindow = await prisma.emailDigestWindow.findFirst({
      where: { digest: { date: input.date }, windowType: input.windowType },
    });
    if (!existingWindow) {
      return NextResponse.json(
        { error: "Rate limit exceeded: maximum 8 windows per day" },
        { status: 429 },
      );
    }
  }

  const { result, error } = await withPrismaError("Failed to ingest email digest", async () => {
    return prisma.$transaction(async (tx) => {
      // 1. Upsert the daily digest
      const digest = await tx.emailDigest.upsert({
        where: { date: input.date },
        create: { date: input.date, createdById: ownerId },
        update: { updatedAt: new Date() },
      });

      // 2. Check for existing window (for re-ingest preservation)
      const existingWindow = await tx.emailDigestWindow.findUnique({
        where: { digestId_windowType: { digestId: digest.id, windowType: input.windowType } },
        include: { items: { select: { id: true, sender: true, subject: true, isActioned: true, actionedAt: true, convertedToTaskId: true } } },
      });

      // Build a lookup of actioned state from existing items (for re-ingest preservation)
      const actionedLookup = new Map<string, { isActioned: boolean; actionedAt: Date | null; convertedToTaskId: string | null }>();
      if (existingWindow) {
        for (const item of existingWindow.items) {
          const key = `${item.sender}|||${item.subject}`;
          if (item.isActioned || item.convertedToTaskId) {
            actionedLookup.set(key, {
              isActioned: item.isActioned,
              actionedAt: item.actionedAt,
              convertedToTaskId: item.convertedToTaskId,
            });
          }
        }
      }

      // 3. Upsert the window
      const window = existingWindow
        ? await tx.emailDigestWindow.update({
            where: { id: existingWindow.id },
            data: {
              windowStart: input.windowStart,
              windowEnd: input.windowEnd,
              totalEmails: input.totalEmails,
              threadCount: input.threadCount,
              continuingThreads: input.continuingThreads,
              actionRequired: input.actionRequired,
              rawSummary: input.rawSummary ?? null,
              lastIngestedAt: new Date(),
            },
          })
        : await tx.emailDigestWindow.create({
            data: {
              digestId: digest.id,
              windowType: input.windowType,
              windowStart: input.windowStart,
              windowEnd: input.windowEnd,
              totalEmails: input.totalEmails,
              threadCount: input.threadCount,
              continuingThreads: input.continuingThreads,
              actionRequired: input.actionRequired,
              rawSummary: input.rawSummary ?? null,
            },
          });

      // 4. Always delete existing items for this window before inserting
      // (handles both re-ingests and cleanup of orphaned records from partial failures)
      await tx.emailDigestItem.deleteMany({ where: { windowId: window.id } });

      // 5. Insert new items, preserving actioned state from previous ingest
      const items = await Promise.all(
        input.items.map((item) => {
          const key = `${item.sender}|||${item.subject}`;
          const preserved = actionedLookup.get(key);

          return tx.emailDigestItem.create({
            data: {
              windowId: window.id,
              tier: item.tier,
              position: item.position,
              sender: item.sender,
              senderEmail: item.senderEmail ?? null,
              subject: item.subject,
              folder: item.folder,
              receivedAt: item.receivedAt ? new Date(item.receivedAt) : null,
              threadSize: item.threadSize,
              hasAttachment: item.hasAttachment,
              summary: item.summary,
              actionNeeded: item.actionNeeded ?? null,
              isDeadline: item.isDeadline,
              deadlineDate: item.deadlineDate ? new Date(item.deadlineDate) : null,
              needsResponse: item.needsResponse,
              draftResponse: item.draftResponse ?? null,
              draftContext: item.draftContext ?? null,
              isActioned: preserved?.isActioned ?? false,
              actionedAt: preserved?.actionedAt ?? null,
              convertedToTaskId: preserved?.convertedToTaskId ?? null,
              isCarriedForward: item.isCarriedForward,
              carriedFromWindow: item.carriedFromWindow ?? null,
            },
          });
        }),
      );

      return { digestId: digest.id, windowId: window.id, itemCount: items.length };
    });
  });

  if (error) return error;

  return NextResponse.json({ success: true, ...result });
}
