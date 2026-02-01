-- CreateEnum
CREATE TYPE "RentalApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "RentalApplication" ADD COLUMN     "rentAmount" DECIMAL(12,2),
ADD COLUMN     "status" "RentalApplicationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "RentalApplication_status_idx" ON "RentalApplication"("status");
