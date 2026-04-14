import { z } from "zod";
import { optionalString } from "@/lib/validation-helpers";

export const createDiaryEntrySchema = z.object({
  type: z.enum(["NOTE", "EVENT", "CONVERSATION"]).default("NOTE"),
  date: z.string().min(1, "Date is required"),
  time: z.string().nullable().default(null),
  heading: z.string().min(1, "Heading is required"),
  people: z.array(z.string()).default([]),
  content: optionalString,
  isImportant: z.boolean().default(false),
});

export const updateDiaryEntrySchema = createDiaryEntrySchema.partial();

export type CreateDiaryEntryInput = z.infer<typeof createDiaryEntrySchema>;
export type UpdateDiaryEntryInput = z.infer<typeof updateDiaryEntrySchema>;
