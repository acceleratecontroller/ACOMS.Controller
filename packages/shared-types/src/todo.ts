import type { TaskStatus, TaskPriority, RecurrenceFrequency } from "./index";

// Input type for creating a new task via the API
export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string; // ISO date string
  categoryIds?: string[];
  recurrence?: RecurrenceRuleInput;
}

// Input type for updating an existing task
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  categoryIds?: string[];
}

// Input type for setting up recurrence on a task
export interface RecurrenceRuleInput {
  frequency: RecurrenceFrequency;
  interval?: number; // e.g. every 2 weeks
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  dayOfMonth?: number; // for monthly: which day (1-31)
  endDate?: string; // ISO date string — when to stop recurring
}
