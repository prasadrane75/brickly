-- Create enum for sell order strategy
CREATE TYPE "SellOrderStrategy" AS ENUM ('MAX_PRICE', 'BALANCED', 'FAST_EXIT');

-- Property updates
ALTER TABLE "Property"
ADD COLUMN "liquidityScore" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "lastTradeAt" TIMESTAMP(3);

-- ShareClass updates
ALTER TABLE "ShareClass"
ADD COLUMN "lastReferenceUpdateAt" TIMESTAMP(3);

-- SellOrder updates
ALTER TABLE "SellOrder"
ADD COLUMN "remainingShares" INTEGER,
ADD COLUMN "liquidityScoreAtCreation" INTEGER,
ADD COLUMN "strategy" "SellOrderStrategy" NOT NULL DEFAULT 'BALANCED';

-- Initialize remaining shares for existing orders
UPDATE "SellOrder"
SET "remainingShares" = "sharesForSale"
WHERE "remainingShares" IS NULL;

ALTER TABLE "SellOrder"
ALTER COLUMN "remainingShares" SET NOT NULL;
