// ============================================================
// Shared types used across all ACOMS Controller apps
// ============================================================

// Task status — used by To-Do app and future modules
export type TaskStatus = "todo" | "in_progress" | "done";

// Priority levels — shared concept across ACOMS
export type TaskPriority = "low" | "medium" | "high" | "urgent";

// Recurrence patterns
export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

// Re-export module-specific types
export * from "./todo";
