import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getDateBoundaries } from "@/lib/date-utils";
import { getStockLevels } from "@/lib/stock";

// GET /api/dashboard — Dashboard summary stats
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { today, tomorrow } = getDateBoundaries();

  // Filter tasks to logged-in employee if available
  const employeeId = session.user.employeeId ?? null;
  const taskAssigneeFilter = employeeId ? { assigneeId: employeeId } : {};

  const [
    activeTaskCount,
    overdueTaskCount,
    overdueTasks,
    dueTodayTaskCount,
    dueTodayTasks,
    overdueRecurringCount,
    overdueRecurringTasks,
    dueTodayRecurringCount,
    dueTodayRecurringTasks,
    upcomingTasks,
  ] = await Promise.all([
    prisma.task.count({
      where: { isArchived: false, status: { not: "COMPLETED" }, ...taskAssigneeFilter },
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
      take: 5,
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
      take: 5,
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
      take: 5,
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
      take: 5,
    }),
    prisma.task.findMany({
      where: {
        isArchived: false,
        status: { not: "COMPLETED" },
        dueDate: { gte: today },
        ...taskAssigneeFilter,
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
  ]);

  // ─── Materials summary ───────────────────────────────────
  const [lowStockItems, recentMovements, openStocktakes, itemCount, locationCount] = await Promise.all([
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

  return NextResponse.json({
    // Task data
    activeTaskCount,
    overdueTaskCount,
    overdueRecurringCount,
    overdueTasks,
    overdueRecurringTasks,
    dueTodayTaskCount,
    dueTodayTasks,
    dueTodayRecurringCount,
    dueTodayRecurringTasks,
    upcomingTasks,
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
