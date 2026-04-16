-- Add due date to JobRequest (quote submission due date or work order due date)
ALTER TABLE "JobRequest" ADD COLUMN "dueDate" TIMESTAMP(3);
