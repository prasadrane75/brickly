-- AlterEnum
ALTER TYPE "PropertyStatus" ADD VALUE 'RENT_LISTED';

-- CreateTable
CREATE TABLE "RentalApplication" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "tenantUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentalApplication_propertyId_idx" ON "RentalApplication"("propertyId");

-- CreateIndex
CREATE INDEX "RentalApplication_tenantUserId_idx" ON "RentalApplication"("tenantUserId");

-- AddForeignKey
ALTER TABLE "RentalApplication" ADD CONSTRAINT "RentalApplication_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalApplication" ADD CONSTRAINT "RentalApplication_tenantUserId_fkey" FOREIGN KEY ("tenantUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
