/**
 * Timezone-aware date boundary helpers.
 *
 * The app uses Australian time. All "today/tomorrow" boundaries reflect
 * the Australian date, not UTC. Prisma stores DateTime as UTC, so we
 * convert Australian-midnight to UTC for queries.
 */

const APP_TIMEZONE = "Australia/Sydney";

export function todayInAppTz(): Date {
  const formatter = new Intl.DateTimeFormat("en-AU", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const day = parts.find((p) => p.type === "day")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const year = parts.find((p) => p.type === "year")!.value;

  const midnightLocal = `${year}-${month}-${day}T00:00:00`;

  // Try AEDT (+11:00) first
  const rough = new Date(`${midnightLocal}+11:00`);
  const checkParts = formatter.formatToParts(rough);
  const checkDay = checkParts.find((p) => p.type === "day")!.value;

  if (checkDay === day) return rough;

  // Fall back to AEST (+10:00)
  return new Date(`${midnightLocal}+10:00`);
}

export function getDateBoundaries() {
  const today = todayInAppTz();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const sevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  return { today, tomorrow, sevenDays, thirtyDays };
}
