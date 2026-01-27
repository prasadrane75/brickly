-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('INVESTOR', 'LISTER', 'ADMIN', 'TENANT');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'LISTED', 'FUNDED', 'RENTED', 'SOLD');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'LISTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "SellOrderStatus" AS ENUM ('OPEN', 'PARTIAL', 'FILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "KycStatus" NOT NULL,
    "data" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" UUID NOT NULL,
    "address1" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "status" "PropertyStatus" NOT NULL,
    "targetRaise" DECIMAL(14,2),
    "estMonthlyRent" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "listerUserId" UUID NOT NULL,
    "bonusPercent" DECIMAL(6,3) NOT NULL,
    "askingPrice" DECIMAL(14,2) NOT NULL,
    "status" "ListingStatus" NOT NULL,
    "postedAt" TIMESTAMP(3),

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyImage" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareClass" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "totalShares" INTEGER NOT NULL,
    "sharesAvailable" INTEGER NOT NULL,
    "referencePricePerShare" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "ShareClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holding" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "shareClassId" UUID NOT NULL,
    "sharesOwned" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellOrder" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "sharesForSale" INTEGER NOT NULL,
    "askPricePerShare" DECIMAL(14,4) NOT NULL,
    "optimizedPricePerShare" DECIMAL(14,4),
    "status" "SellOrderStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" UUID NOT NULL,
    "sellOrderId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "buyerUserId" UUID NOT NULL,
    "sellerUserId" UUID NOT NULL,
    "sharesTraded" INTEGER NOT NULL,
    "pricePerShare" DECIMAL(14,4) NOT NULL,
    "tradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "KycProfile_userId_key" ON "KycProfile"("userId");

-- CreateIndex
CREATE INDEX "KycProfile_status_idx" ON "KycProfile"("status");

-- CreateIndex
CREATE INDEX "Property_city_state_idx" ON "Property"("city", "state");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateIndex
CREATE INDEX "Listing_propertyId_idx" ON "Listing"("propertyId");

-- CreateIndex
CREATE INDEX "Listing_listerUserId_idx" ON "Listing"("listerUserId");

-- CreateIndex
CREATE INDEX "Listing_status_idx" ON "Listing"("status");

-- CreateIndex
CREATE INDEX "PropertyImage_propertyId_idx" ON "PropertyImage"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyImage_sortOrder_idx" ON "PropertyImage"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ShareClass_propertyId_key" ON "ShareClass"("propertyId");

-- CreateIndex
CREATE INDEX "ShareClass_propertyId_idx" ON "ShareClass"("propertyId");

-- CreateIndex
CREATE INDEX "Holding_userId_idx" ON "Holding"("userId");

-- CreateIndex
CREATE INDEX "Holding_shareClassId_idx" ON "Holding"("shareClassId");

-- CreateIndex
CREATE UNIQUE INDEX "Holding_userId_shareClassId_key" ON "Holding"("userId", "shareClassId");

-- CreateIndex
CREATE INDEX "SellOrder_userId_idx" ON "SellOrder"("userId");

-- CreateIndex
CREATE INDEX "SellOrder_propertyId_idx" ON "SellOrder"("propertyId");

-- CreateIndex
CREATE INDEX "SellOrder_status_idx" ON "SellOrder"("status");

-- CreateIndex
CREATE INDEX "Trade_sellOrderId_idx" ON "Trade"("sellOrderId");

-- CreateIndex
CREATE INDEX "Trade_propertyId_idx" ON "Trade"("propertyId");

-- CreateIndex
CREATE INDEX "Trade_buyerUserId_idx" ON "Trade"("buyerUserId");

-- CreateIndex
CREATE INDEX "Trade_sellerUserId_idx" ON "Trade"("sellerUserId");

-- AddForeignKey
ALTER TABLE "KycProfile" ADD CONSTRAINT "KycProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_listerUserId_fkey" FOREIGN KEY ("listerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareClass" ADD CONSTRAINT "ShareClass_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holding" ADD CONSTRAINT "Holding_shareClassId_fkey" FOREIGN KEY ("shareClassId") REFERENCES "ShareClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellOrder" ADD CONSTRAINT "SellOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellOrder" ADD CONSTRAINT "SellOrder_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_sellOrderId_fkey" FOREIGN KEY ("sellOrderId") REFERENCES "SellOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
