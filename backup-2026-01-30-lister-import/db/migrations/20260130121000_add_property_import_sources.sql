-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('OWNER', 'PUBLIC', 'PARTNER', 'MLS');

-- AlterTable
ALTER TABLE "Property"
ADD COLUMN     "sourceType" "SourceType",
ADD COLUMN     "sourceRefId" TEXT,
ADD COLUMN     "importedAt" TIMESTAMP(3),
ADD COLUMN     "sourceAttribution" TEXT;
