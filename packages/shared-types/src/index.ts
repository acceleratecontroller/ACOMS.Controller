// ============================================================
// Shared types used across all ACOMS Controller apps
// ============================================================

// Task status — matches Prisma TaskStatus enum
export type TaskStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "STUCK"
  | "AWAITING_RESPONSE"
  | "COMPLETED";

// Priority levels
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

// Recurrence patterns
export type RecurringFrequency =
  | "DAILY"
  | "WEEKLY"
  | "FORTNIGHTLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY";

// Schedule types for recurring tasks
export type ScheduleType = "FIXED" | "FLOATING";

// Re-export module-specific types
export * from "./todo";
export * from "./materials";
