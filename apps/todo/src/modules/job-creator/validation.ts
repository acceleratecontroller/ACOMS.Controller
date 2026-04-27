import { z } from "zod";
import { optionalString } from "@/lib/validation-helpers";

export const createJobRequestSchema = z.object({
  depot: z.enum(["BRISBANE", "HERVEY_BAY", "BUNDABERG", "MACKAY"]),
  client: z.string().min(1, "Client is required"),
  contract: z.string().min(1, "Contract is required"),
  jobType: z.enum(["QUOTE", "DIRECT_WORK_ORDER"]),
  financePONumber: optionalString,
  clientReference: z.string().min(1, "Client reference number is required"),
  projectName: z.string().min(1, "Project name is required"),
  address: optionalString,
  jobReceivedDate: z.string().min(1, "Job received date is required"),
  quoteReceivedDate: optionalString,
  workOrderReceivedDate: optionalString,
  quoteDueDate: optionalString,
  workOrderDueDate: optionalString,
  clientContactName: optionalString,
  clientContactPhone: optionalString,
  clientContactEmail: optionalString,
  emailContent: optionalString,
});

export const updateJobRequestSchema = createJobRequestSchema.partial();

export const rejectJobRequestSchema = z.object({
  rejectionReason: z.string().min(1, "Rejection reason is required"),
});

export const approveJobRequestSchema = z.object({
  jobType: z.enum(["QUOTE", "DIRECT_WORK_ORDER"]).optional(),
  integrations: z
    .object({
      googleSheets: z.boolean().default(true),
      serviceM8: z.boolean().default(true),
      simPro: z.boolean().default(true),
    })
    .default({}),
});

export type CreateJobRequestInput = z.infer<typeof createJobRequestSchema>;
export type UpdateJobRequestInput = z.infer<typeof updateJobRequestSchema>;
export type RejectJobRequestInput = z.infer<typeof rejectJobRequestSchema>;
export type ApproveJobRequestInput = z.infer<typeof approveJobRequestSchema>;
