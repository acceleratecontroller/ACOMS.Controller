import { z } from "zod";

/**
 * Shared Zod helper for optional string fields that may arrive as
 * string | "" | null | undefined from forms and API clients.
 */
export const optionalString = z
  .string()
  .optional()
  .nullable()
  .or(z.literal(""));

/**
 * Positive decimal — reusable for quantity fields.
 */
export const positiveDecimal = z
  .number()
  .positive("Quantity must be greater than zero");
