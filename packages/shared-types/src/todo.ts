import type { TaskStatus, TaskPriority, RecurringFrequency, ScheduleType } from "./index";

// Input type for creating a new task via the API
export interface CreateTaskInput {
  title: string;
  projectId?: string;
  notes?: string;
  label?: string;
  dueDate?: string; // ISO date string
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId: string;
}

// Input type for updating an existing task
export interface UpdateTaskInput {
  title?: string;
  projectId?: string | null;
  notes?: string | null;
  label?: string;
  dueDate?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
}

// Input type for creating a recurring task
export interface CreateRecurringTaskInput {
  title: string;
  description?: string;
  category?: string;
  frequencyType?: RecurringFrequency;
  frequencyValue?: number;
  scheduleType?: ScheduleType;
  lastCompleted?: string; // ISO date string
  assigneeId: string;
}

// Input type for updating a recurring task
export interface UpdateRecurringTaskInput {
  title?: string;
  description?: string | null;
  category?: string;
  frequencyType?: RecurringFrequency;
  frequencyValue?: number;
  scheduleType?: ScheduleType;
  lastCompleted?: string | null;
  assigneeId?: string;
}
