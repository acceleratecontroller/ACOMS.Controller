-- AlterTable
ALTER TABLE "QuickNote" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "QuickNote" ADD COLUMN "pinnedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "QuickNote_isPinned_idx" ON "QuickNote"("isPinned");
