-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('HOUSE', 'TOWNHOME', 'APARTMENT', 'CONDO');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "type" "PropertyType" NOT NULL DEFAULT 'HOUSE';
