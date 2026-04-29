CREATE TYPE "BuyOrderStatus" AS ENUM ('OPEN', 'PARTIAL', 'FILLED', 'CANCELLED');
CREATE TYPE "BuyOrderType" AS ENUM ('MARKET', 'LIMIT');

CREATE TABLE "BuyOrder" (
    "id" UUID NOT NULL,
    "buyerUserId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "orderType" "BuyOrderType" NOT NULL,
    "sharesRequested" INTEGER NOT NULL,
    "filledShares" INTEGER NOT NULL DEFAULT 0,
    "maxPricePerShare" DECIMAL(14,4),
    "status" "BuyOrderStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyOrder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BuyOrder_buyerUserId_idx" ON "BuyOrder"("buyerUserId");
CREATE INDEX "BuyOrder_propertyId_idx" ON "BuyOrder"("propertyId");
CREATE INDEX "BuyOrder_status_idx" ON "BuyOrder"("status");
CREATE INDEX "BuyOrder_createdAt_idx" ON "BuyOrder"("createdAt");

ALTER TABLE "BuyOrder" ADD CONSTRAINT "BuyOrder_buyerUserId_fkey"
  FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuyOrder" ADD CONSTRAINT "BuyOrder_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
