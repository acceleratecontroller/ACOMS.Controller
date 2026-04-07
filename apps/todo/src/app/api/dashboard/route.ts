import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getDateBoundaries } from "@/lib/date-utils";
import { getStockLevels } from "@/lib/stock";
import { getEmployeeByIdentityId, getAssignableEmployees } from "@/lib/acoms-os";

export const dynamic = "force-dynamic";

// GET /api/dashboard — Dashboard summary stats
export async function GET() {
  const { session, error: authErr } = await requireAuth();
  if (authErr) return authErr;

  const { today, tomorrow, sevenDays } = getDateBoundaries();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Resolve employee ID in parallel with material queries (which don't need it)
  const identityId = session.user.identityId ?? null;
  const [employeeResult, assignees, lowStockItems, recentMovements, openStocktakes, itemCount, locationCount] = await Promise.all([
    identityId ? getEmployeeByIdentityId(identityId) : Promise.resolve(null),
    getAssignableEmployees(),
    getStockLevels({ belowMinimumOnly: true }),
    prisma.stockMovement.findMany({
      include: {
        item: { select: { code: true, description: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.stocktake.findMany({
      where: { status: "DRAFT" },
      include: {
        location: { select: { name: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.item.count({ where: { isArchived: false } }),
    prisma.location.count({ where: { isArchived: false } }),
  ]);

  const employeeId = employeeResult?.id ?? null;
  const taskAssigneeFilter = employeeId ? { assigneeId: employeeId } : {};

  // Build assignee lookup map
  const assigneeMap: Record<string, string> = {};
  for (const emp of assignees) {
    assigneeMap[emp.id] = `${emp.firstName} ${emp.lastName}`;
  }

  const [
    activeTaskCount,
    pendingTaskCount,
    overdueTaskCount,
    overdueTasks,
    dueTodayTaskCount,
    dueTodayTasks,
    dueSoonTasks,
    overdueRecurringCount,
    overdueRecurringTasks,
    dueTodayRecurringCount,
    dueTodayRecurringTasks,
    upcomingRecurring,
    completedRecentCount,
    recentNotes,
    totalNoteCount,
    highPriorityTasks,
  ] = await Promise.all([
    prisma.task.count({
      where: { isArchived: false, status: { not: "COMPLETED" }, ...taskAssigneeFilter },
    }),
    prisma.task.count({
      where: { isArchived: false, status: "NOT_STARTED", ...taskAssigneeFilter },
    }),
    prisma.task.count({
      where: {
        isArchived: false,
        status: { not: "COMPLETED" },
        dueDate: { lt: today },
        ...taskAssigneeFilter,
      },
    }),
    prisma.task.findMany({
      where: {
        isArchived: false,
        status: { not: "COMPLETED" },
        dueDate: { lt: today },
        ...taskAssigneeFilter,
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.task.count({
      where: {
        isArchived: false,
        status: { not: "COMPLETED" },
        dueDate: { gte: today, lt: tomorrow },
        ...taskAssigneeFilter,
      },
    }),
    prisma.task.findMany({
      where: {
        isArchived: false,
        status: { not: "COMPLETED" },
        dueDate: { gte: today, lt: tomorrow },
        ...taskAssigneeFilter,
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.task.findMany({
      where: {
        isArchived: false,
        status: { not: "COMPLETED" },
        dueDate: { gt: tomorrow, lte: sevenDays },
        ...taskAssigneeFilter,
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.recurringTask.count({
      where: {
        isArchived: false,
        nextDue: { lt: today },
        ...taskAssigneeFilter,
      },
    }),
    prisma.recurringTask.findMany({
      where: {
        isArchived: false,
        nextDue: { lt: today },
        ...taskAssigneeFilter,
      },
      orderBy: { nextDue: "asc" },
      take: 8,
    }),
    prisma.recurringTask.count({
      where: {
        isArchived: false,
        nextDue: { gte: today, lt: tomorrow },
        ...taskAssigneeFilter,
      },
    }),
    prisma.recurringTask.findMany({
      where: {
        isArchived: false,
        nextDue: { gte: today, lt: tomorrow },
        ...taskAssigneeFilter,
      },
      orderBy: { nextDue: "asc" },
      take: 8,
    }),
    // Upcoming recurring (next 8 due from today onwards, not overdue)
    prisma.recurringTask.findMany({
      where: {
        isArchived: false,
        nextDue: { gte: today },
        ...taskAssigneeFilter,
      },
      orderBy: { nextDue: "asc" },
      take: 8,
    }),
    prisma.task.count({
      where: {
        isArchived: false,
        status: "COMPLETED",
        updatedAt: { gte: sevenDaysAgo },
        ...taskAssigneeFilter,
      },
    }),
    // Recent notes for dashboard
    prisma.quickNote.findMany({
      where: {
        createdById: session.user.id,
        isArchived: false,
      },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    // Total note count for badge
    prisma.quickNote.count({
      where: {
        createdById: session.user.id,
        isArchived: false,
      },
    }),
    // High priority tasks not completed
    prisma.task.findMany({
      where: {
        isArchived: false,
        status: { not: "COMPLETED" },
        priority: "HIGH",
        ...taskAssigneeFilter,
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
  ]);

  return NextResponse.json({
    // Task summary counts
    activeTaskCount,
    pendingTaskCount,
    overdueTaskCount,
    overdueRecurringCount,
    dueTodayTaskCount,
    dueTodayRecurringCount,
    completedRecentCount,
    // Task lists
    overdueTasks,
    overdueRecurringTasks,
    dueTodayTasks,
    dueTodayRecurringTasks,
    dueSoonTasks,
    highPriorityTasks,
    // Upcoming recurring
    upcomingRecurring,
    // Notes
    recentNotes,
    totalNoteCount,
    // Assignee lookup
    assigneeMap,
    // Materials data
    materials: {
      lowStockItems,
      recentMovements,
      openStocktakes,
      itemCount,
      locationCount,
    },
  });
}
