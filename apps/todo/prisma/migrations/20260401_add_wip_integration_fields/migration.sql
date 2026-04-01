-- Add WIP integration fields to Job table
ALTER TABLE "Job" ADD COLUMN "wipProjectId" TEXT;
ALTER TABLE "Job" ADD COLUMN "stage" TEXT;
ALTER TABLE "Job" ADD COLUMN "siteAddress" TEXT;
ALTER TABLE "Job" ADD COLUMN "depotName" TEXT;
ALTER TABLE "Job" ADD COLUMN "wipSyncedAt" TIMESTAMP(3);

-- Add unique index on wipProjectId (one-to-one with WIP)
CREATE UNIQUE INDEX "Job_wipProjectId_key" ON "Job"("wipProjectId");

-- Add index for lookups
CREATE INDEX "Job_wipProjectId_idx" ON "Job"("wipProjectId");
