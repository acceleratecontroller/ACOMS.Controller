import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseBody, withPrismaError } from "@/lib/api-helpers";
import { updateEmailDigestItemSchema } from "@/modules/email-digest/validation";
import { TIER_PRIORITY_MAP } from "@/modules/email-digest/constants";
import { getEmployeeByIdentityId } from "@/lib/acoms-os";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// PUT /api/email-digest/items/[id] — Mark item actioned or convert to task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const ownerId = process.env.EMAIL_DIGEST_OWNER_ID;
  if (!ownerId || session.user.identityId !== ownerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const { data: body, error: parseErr } = await parseBody(request);
  if (parseErr) return parseErr;

  const parsed = updateEmailDigestItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Fetch the existing item
  const { result: item, error: fetchErr } = await withPrismaError("Failed to fetch item", () =>
    prisma.emailDigestItem.findUniqueOrThrow({ where: { id } }),
  );
  if (fetchErr) return fetchErr;

  const updates: Record<string, unknown> = {};

  // Mark as actioned
  if (input.isActioned !== undefined) {
    updates.isActioned = input.isActioned;
    updates.actionedAt = input.isActioned ? new Date() : null;
  }

  // Convert to task
  let createdTask = null;
  if (input.convertToTask && !item.convertedToTaskId) {
    const employee = await getEmployeeByIdentityId(session.user.identityId);
    const assigneeId = employee?.id ?? session.user.id;

    const priority = TIER_PRIORITY_MAP[item.tier] ?? "MEDIUM";
    const notes = [item.summary, item.actionNeeded ? `Action needed: ${item.actionNeeded}` : null]
      .filter(Boolean)
      .join("\n\n");

    const { result: task, error: taskErr } = await withPrismaError("Failed to create task", () =>
      prisma.task.create({
        data: {
          title: item.subject,
          notes,
          priority,
          assigneeId,
          createdById: session.user.id,
          dueDate: item.deadlineDate ?? null,
          appId: "default",
        },
      }),
    );
    if (taskErr) return taskErr;

    createdTask = task;
    updates.convertedToTaskId = task.id;
    updates.isActioned = true;
    updates.actionedAt = new Date();

    audit({
      entityType: "Task",
      entityId: task.id,
      action: "CREATE",
      entityLabel: task.title,
      performedById: session.user.id,
      changes: { source: { from: null, to: "email-digest" }, emailDigestItemId: { from: null, to: id } },
    });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ item });
  }

  const { result: updated, error: updateErr } = await withPrismaError("Failed to update item", () =>
    prisma.emailDigestItem.update({ where: { id }, data: updates }),
  );
  if (updateErr) return updateErr;

  // Audit the action
  if (input.isActioned !== undefined) {
    audit({
      entityType: "EmailDigestItem",
      entityId: id,
      action: "UPDATE",
      entityLabel: item.subject,
      performedById: session.user.id,
      changes: { isActioned: { from: item.isActioned, to: input.isActioned } },
    });
  }

  return NextResponse.json({
    item: updated,
    ...(createdTask ? { createdTask: { id: createdTask.id, title: createdTask.title } } : {}),
  });
}
