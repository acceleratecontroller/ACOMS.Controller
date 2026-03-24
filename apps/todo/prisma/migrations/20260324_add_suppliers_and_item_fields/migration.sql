-- Add OTHER to UnitOfMeasure enum
ALTER TYPE "UnitOfMeasure" ADD VALUE IF NOT EXISTS 'OTHER';

-- Create Supplier table
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on Supplier name
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");

-- Add index on Supplier isArchived
CREATE INDEX "Supplier_isArchived_idx" ON "Supplier"("isArchived");

-- Add new columns to Item table
ALTER TABLE "Item" ADD COLUMN "customUnitOfMeasure" TEXT;
ALTER TABLE "Item" ADD COLUMN "ownershipType" "OwnershipType" NOT NULL DEFAULT 'COMPANY';
ALTER TABLE "Item" ADD COLUMN "clientName" TEXT;
ALTER TABLE "Item" ADD COLUMN "supplierId" TEXT;

-- Add foreign key for Item -> Supplier
ALTER TABLE "Item" ADD CONSTRAINT "Item_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes on new Item columns
CREATE INDEX "Item_supplierId_idx" ON "Item"("supplierId");
CREATE INDEX "Item_ownershipType_idx" ON "Item"("ownershipType");
