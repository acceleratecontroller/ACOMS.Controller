-- Add separate received date and due date fields for quotes and work orders
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "quoteReceivedDate" TIMESTAMP(3);
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "workOrderReceivedDate" TIMESTAMP(3);
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "quoteDueDate" TIMESTAMP(3);
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "workOrderDueDate" TIMESTAMP(3);
