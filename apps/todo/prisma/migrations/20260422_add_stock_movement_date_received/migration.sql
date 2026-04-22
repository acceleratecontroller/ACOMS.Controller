-- Add user-supplied received date to StockMovement (distinct from createdAt, which records when the entry was logged).
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "dateReceived" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "StockMovement_dateReceived_idx" ON "StockMovement" ("dateReceived");
