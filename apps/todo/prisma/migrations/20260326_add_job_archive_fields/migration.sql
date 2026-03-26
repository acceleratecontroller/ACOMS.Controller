-- Add archive fields to Job table
ALTER TABLE "Job" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN "archivedById" TEXT;

-- Add index on Job isArchived
CREATE INDEX "Job_isArchived_idx" ON "Job"("isArchived");
