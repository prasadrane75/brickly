-- CreateTable
CREATE TABLE "MLSListing" (
    "id" UUID NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "listPrice" DECIMAL(14,2) NOT NULL,
    "rentEstimate" DECIMAL(14,2) NOT NULL,
    "beds" INTEGER NOT NULL,
    "baths" DECIMAL(4,1) NOT NULL,
    "sqft" INTEGER NOT NULL,
    "yearBuilt" INTEGER NOT NULL,
    "images" TEXT[] NOT NULL,
    "thumbUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attribution" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MLSListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MLSListing_externalId_key" ON "MLSListing"("externalId");

-- CreateIndex
CREATE INDEX "MLSListing_sourceType_idx" ON "MLSListing"("sourceType");

-- CreateIndex
CREATE INDEX "MLSListing_city_state_idx" ON "MLSListing"("city", "state");

-- CreateIndex
CREATE INDEX "MLSListing_externalId_idx" ON "MLSListing"("externalId");
