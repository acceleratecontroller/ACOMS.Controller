-- CreateEnum
CREATE TYPE "ClientReturnStatus" AS ENUM ('TO_BE_RETURNED', 'RETURNED');

-- CreateTable
CREATE TABLE "ClientReturn" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "jobId" TEXT,
    "locationId" TEXT NOT NULL,
    "status" "ClientReturnStatus" NOT NULL DEFAULT 'TO_BE_RETURNED',
    "notes" TEXT,
    "returnedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientReturn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientReturn_status_idx" ON "ClientReturn"("status");
CREATE INDEX "ClientReturn_jobId_idx" ON "ClientReturn"("jobId");
CREATE INDEX "ClientReturn_locationId_idx" ON "ClientReturn"("locationId");

-- AddForeignKey
ALTER TABLE "ClientReturn" ADD CONSTRAINT "ClientReturn_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientReturn" ADD CONSTRAINT "ClientReturn_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClientReturn" ADD CONSTRAINT "ClientReturn_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
