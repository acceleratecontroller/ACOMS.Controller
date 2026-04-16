-- Add separate due date fields for quotes and work orders
ALTER TABLE "JobRequest" ADD COLUMN "quoteDueDate" TIMESTAMP(3);
ALTER TABLE "JobRequest" ADD COLUMN "workOrderDueDate" TIMESTAMP(3);
