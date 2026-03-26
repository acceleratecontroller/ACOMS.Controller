-- Add fromStockQty to JobMaterial table (tracks stock allocated from existing unallocated inventory)
ALTER TABLE "JobMaterial" ADD COLUMN "fromStockQty" DECIMAL(65,30) NOT NULL DEFAULT 0;
