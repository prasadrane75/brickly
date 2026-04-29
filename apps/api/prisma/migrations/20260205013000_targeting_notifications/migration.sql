-- Create enum for notifications
CREATE TYPE "NotificationType" AS ENUM ('TARGETED_OFFER');

-- Property views
CREATE TABLE "PropertyView" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 1,
    "lastViewedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyView_pkey" PRIMARY KEY ("id")
);

-- Targeted offers
CREATE TABLE "TargetedOffer" (
    "id" UUID NOT NULL,
    "sellOrderId" UUID NOT NULL,
    "buyerUserId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TargetedOffer_pkey" PRIMARY KEY ("id")
);

-- Notifications
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sellOrderId" UUID,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Indexes and constraints
CREATE UNIQUE INDEX "PropertyView_userId_propertyId_key" ON "PropertyView"("userId", "propertyId");
CREATE INDEX "PropertyView_propertyId_idx" ON "PropertyView"("propertyId");
CREATE INDEX "PropertyView_lastViewedAt_idx" ON "PropertyView"("lastViewedAt");

CREATE UNIQUE INDEX "TargetedOffer_sellOrderId_buyerUserId_key" ON "TargetedOffer"("sellOrderId", "buyerUserId");
CREATE INDEX "TargetedOffer_buyerUserId_idx" ON "TargetedOffer"("buyerUserId");

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE UNIQUE INDEX "Notification_userId_sellOrderId_type_key" ON "Notification"("userId", "sellOrderId", "type");

-- Foreign keys
ALTER TABLE "PropertyView" ADD CONSTRAINT "PropertyView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyView" ADD CONSTRAINT "PropertyView_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TargetedOffer" ADD CONSTRAINT "TargetedOffer_sellOrderId_fkey" FOREIGN KEY ("sellOrderId") REFERENCES "SellOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TargetedOffer" ADD CONSTRAINT "TargetedOffer_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sellOrderId_fkey" FOREIGN KEY ("sellOrderId") REFERENCES "SellOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
