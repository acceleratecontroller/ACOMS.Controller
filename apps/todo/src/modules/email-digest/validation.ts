import { z } from "zod";

export const emailDigestItemSchema = z.object({
  tier: z.enum(["TIER_1_ACTION", "TIER_2_UPDATE", "TIER_3_FYI"]),
  position: z.number().int().min(1),
  sender: z.string().min(1),
  senderEmail: z.string().email().optional().nullable(),
  subject: z.string().min(1),
  folder: z.string().min(1),
  receivedAt: z.string().datetime({ offset: true }).optional().nullable(),
  threadSize: z.number().int().min(1).default(1),
  hasAttachment: z.boolean().default(false),
  summary: z.string().min(1),
  actionNeeded: z.string().optional().nullable(),
  isDeadline: z.boolean().default(false),
  deadlineDate: z.string().datetime({ offset: true }).optional().nullable(),
  needsResponse: z.boolean().default(false),
  draftResponse: z.string().optional().nullable(),
  draftContext: z.string().optional().nullable(),
  isCarriedForward: z.boolean().default(false),
  carriedFromWindow: z.string().optional().nullable(),
});

export const emailDigestIngestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  windowType: z.enum(["EARLY_MORNING", "MORNING", "MIDDAY", "AFTERNOON"]),
  windowStart: z.string().min(1),
  windowEnd: z.string().min(1),
  totalEmails: z.number().int().min(0),
  threadCount: z.number().int().min(0),
  continuingThreads: z.number().int().min(0),
  actionRequired: z.number().int().min(0),
  rawSummary: z.string().optional().nullable(),
  items: z.array(emailDigestItemSchema),
});

export const updateEmailDigestItemSchema = z.object({
  isActioned: z.boolean().optional(),
  convertToTask: z.boolean().optional(),
});

export type EmailDigestIngestInput = z.infer<typeof emailDigestIngestSchema>;
export type EmailDigestItemInput = z.infer<typeof emailDigestItemSchema>;
export type UpdateEmailDigestItemInput = z.infer<typeof updateEmailDigestItemSchema>;
