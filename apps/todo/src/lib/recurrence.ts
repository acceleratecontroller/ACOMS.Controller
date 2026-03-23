// ============================================================
// Recurrence logic — computes the next due date for a task
// ============================================================

interface RecurrenceRule {
  frequency: string;  // "daily" | "weekly" | "monthly"
  interval: number;   // every N units
  daysOfWeek: string | null; // comma-separated day numbers (0=Sun...6=Sat)
  dayOfMonth: number | null;
  endDate: Date | null;
}

/**
 * Given a recurrence rule and the current due date, compute the next due date.
 * Returns null if the recurrence has ended (past endDate) or can't be computed.
 */
export function getNextDueDate(
  rule: RecurrenceRule,
  currentDueDate: Date
): Date | null {
  let next: Date;

  switch (rule.frequency) {
    case "daily":
      next = addDays(currentDueDate, rule.interval);
      break;

    case "weekly":
      if (rule.daysOfWeek) {
        next = getNextWeeklyDate(currentDueDate, rule.daysOfWeek, rule.interval);
      } else {
        next = addDays(currentDueDate, 7 * rule.interval);
      }
      break;

    case "monthly":
      next = addMonths(currentDueDate, rule.interval);
      if (rule.dayOfMonth) {
        // Set to the specific day, clamping to month end
        const lastDay = new Date(
          next.getFullYear(),
          next.getMonth() + 1,
          0
        ).getDate();
        next.setDate(Math.min(rule.dayOfMonth, lastDay));
      }
      break;

    default:
      return null;
  }

  // If past the end date, stop recurring
  if (rule.endDate && next > rule.endDate) {
    return null;
  }

  return next;
}

// --- Helper functions ---

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function getNextWeeklyDate(
  current: Date,
  daysOfWeekStr: string,
  interval: number
): Date {
  const days = daysOfWeekStr.split(",").map(Number).sort();
  const currentDay = current.getDay();

  // Find the next day in the same week
  for (const day of days) {
    if (day > currentDay) {
      return addDays(current, day - currentDay);
    }
  }

  // No more days this week — jump to the first day in N weeks
  const daysUntilNextWeek = 7 - currentDay + days[0];
  const extraWeeks = (interval - 1) * 7;
  return addDays(current, daysUntilNextWeek + extraWeeks);
}
