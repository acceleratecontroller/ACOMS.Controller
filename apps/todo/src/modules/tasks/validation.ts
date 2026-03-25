import { z } from "zod";
import { optionalString } from "@/lib/validation-helpers";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  projectId: optionalString,
  notes: optionalString,
  label: z.string().default("Task"),
  dueDate: optionalString,
  status: z
    .enum(["NOT_STARTED", "IN_PROGRESS", "STUCK", "AWAITING_RESPONSE", "COMPLETED"])
    .default("NOT_STARTED"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("LOW"),
  assigneeId: z.string().min(1, "Assignee is required"),
});

export const updateTaskSchema = createTaskSchema.partial();

export const createRecurringTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: optionalString,
  category: z.string().default("Task"),
  frequencyType: z
    .enum(["DAILY", "WEEKLY", "FORTNIGHTLY", "MONTHLY", "QUARTERLY", "YEARLY"])
    .default("WEEKLY"),
  frequencyValue: z.number().int().min(1).default(1),
  scheduleType: z.enum(["FIXED", "FLOATING"]).default("FLOATING"),
  lastCompleted: optionalString,
  assigneeId: z.string().min(1, "Assignee is required"),
});

export const updateRecurringTaskSchema = createRecurringTaskSchema.partial();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateRecurringTaskInput = z.infer<typeof createRecurringTaskSchema>;
export type UpdateRecurringTaskInput = z.infer<typeof updateRecurringTaskSchema>;
