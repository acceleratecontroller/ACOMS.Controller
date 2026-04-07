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
  const [
    employeeResult,
    assignees,
    lowStockItems,
    recentMovements,
    openStocktakes,
    pendingJobMaterials,
    pendingClientReturns,
  ] = await Promise.all([
    identityId ? getEmployeeByIdentityId(identityId) : Promise.resolve(null),
    getAssignableEmployees(),
    getStockLevels({ belowMinimumOnly: true }),
    // Recent movements with job context (last 20 to group by job)
    prisma.stockMovement.findMany({
      include: {
        item: { select: { code: true, description: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
        job: { select: { id: true, projectId: true, name: true, client: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.stocktake.findMany({
      where: { status: "DRAFT" },
      include: {
        location: { select: { name: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Jobs with pending/requested materials (awaiting materials)
    prisma.job.findMany({
      where: {
        isArchived: false,
        materials: { some: { status: { in: ["PENDING", "REQUESTED"] } } },
      },
      select: {
        id: true,
        projectId: true,
        name: true,
        client: true,
        _count: { select: { materials: { where: { status: { in: ["PENDING", "REQUESTED"] } } } } },
      },
      take: 5,
    }),
    // Client returns due
    prisma.clientReturn.findMany({
      where: { status: "TO_BE_RETURNED" },
      include: {
        item: { select: { code: true, description: true } },
        job: { select: { projectId: true, name: true, client: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Group recent movements: first 5 jobs with activity, then non-job movements
  const jobMovementMap = new Map<string, {
    jobId: string;
    projectId: string;
    jobName: string;
    client: string;
    movementCount: number;
    movementTypes: string[];
    lastActivity: string;
    totalIssued: number;
  }>();
  const generalMovements: typeof recentMovements = [];

  for (const m of recentMovements) {
    if (m.job) {
      const existing = jobMovementMap.get(m.job.id);
      if (existing) {
        existing.movementCount++;
        if (!existing.movementTypes.includes(m.movementType)) {
          existing.movementTypes.push(m.movementType);
        }
        if (m.movementType === "ISSUED") {
          existing.totalIssued += Number(m.quantity);
        }
      } else {
        jobMovementMap.set(m.job.id, {
          jobId: m.job.id,
          projectId: m.job.projectId,
          jobName: m.job.name,
          client: m.job.client,
          movementCount: 1,
          movementTypes: [m.movementType],
          lastActivity: m.createdAt.toISOString(),
          totalIssued: m.movementType === "ISSUED" ? Number(m.quantity) : 0,
        });
      }
    } else {
      generalMovements.push(m);
    }
  }

  const recentJobActivity = Array.from(jobMovementMap.values()).slice(0, 5);
  const recentGeneralMovements = generalMovements.slice(0, 5);

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
      recentJobActivity,
      recentGeneralMovements,
      openStocktakes,
      pendingJobMaterials,
      pendingClientReturns,
    },
  });
}
