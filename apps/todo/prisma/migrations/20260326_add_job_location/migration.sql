-- Add locationId to Job table (depot/region assignment)
ALTER TABLE "Job" ADD COLUMN "locationId" TEXT;

-- Add foreign key for Job -> Location
ALTER TABLE "Job" ADD CONSTRAINT "Job_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index on Job locationId
CREATE INDEX "Job_locationId_idx" ON "Job"("locationId");
