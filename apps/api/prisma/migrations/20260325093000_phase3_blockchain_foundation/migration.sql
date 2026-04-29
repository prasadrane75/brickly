DO $$
BEGIN
  CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DocumentEntityType" AS ENUM ('PROPERTY', 'TRANSACTION', 'ORDER', 'USER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DocumentKind" AS ENUM (
    'DEED',
    'APPRAISAL',
    'INSPECTION',
    'OFFERING_MEMO',
    'KYC',
    'TRADE_CONFIRMATION',
    'SUBSCRIPTION_AGREEMENT',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BlockchainEntityType" AS ENUM ('PROPERTY', 'TRADE', 'BUY_ORDER', 'SELL_ORDER', 'DOCUMENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BlockchainRecordType" AS ENUM ('OWNERSHIP_PROOF', 'TRANSFER_PROOF', 'DOCUMENT_ATTESTATION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BlockchainSyncStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Document" (
  "id" UUID NOT NULL,
  "uploadedByUserId" UUID,
  "propertyId" UUID,
  "tradeId" UUID,
  "buyOrderId" UUID,
  "sellOrderId" UUID,
  "entityType" "DocumentEntityType" NOT NULL,
  "kind" "DocumentKind" NOT NULL DEFAULT 'OTHER',
  "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
  "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "mimeType" TEXT,
  "fileSizeBytes" INTEGER,
  "aiSummaryCache" TEXT,
  "blockchainTxHash" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Document_uploadedByUserId_idx" ON "Document"("uploadedByUserId");
CREATE INDEX IF NOT EXISTS "Document_propertyId_idx" ON "Document"("propertyId");
CREATE INDEX IF NOT EXISTS "Document_tradeId_idx" ON "Document"("tradeId");
CREATE INDEX IF NOT EXISTS "Document_buyOrderId_idx" ON "Document"("buyOrderId");
CREATE INDEX IF NOT EXISTS "Document_sellOrderId_idx" ON "Document"("sellOrderId");
CREATE INDEX IF NOT EXISTS "Document_entityType_status_idx" ON "Document"("entityType", "status");
CREATE INDEX IF NOT EXISTS "Document_verificationStatus_idx" ON "Document"("verificationStatus");
CREATE INDEX IF NOT EXISTS "Document_createdAt_idx" ON "Document"("createdAt");

DO $$
BEGIN
  ALTER TABLE "Document"
    ADD CONSTRAINT "Document_uploadedByUserId_fkey"
    FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Document"
    ADD CONSTRAINT "Document_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Document"
    ADD CONSTRAINT "Document_tradeId_fkey"
    FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Document"
    ADD CONSTRAINT "Document_buyOrderId_fkey"
    FOREIGN KEY ("buyOrderId") REFERENCES "BuyOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "Document"
    ADD CONSTRAINT "Document_sellOrderId_fkey"
    FOREIGN KEY ("sellOrderId") REFERENCES "SellOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "BlockchainRecord" (
  "id" UUID NOT NULL,
  "entityType" "BlockchainEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "recordType" "BlockchainRecordType" NOT NULL,
  "status" "BlockchainSyncStatus" NOT NULL DEFAULT 'PENDING',
  "network" TEXT NOT NULL,
  "chainId" INTEGER,
  "contractAddress" TEXT,
  "txHash" TEXT,
  "blockNumber" INTEGER,
  "logIndex" INTEGER,
  "walletAddress" TEXT,
  "ownerUserId" UUID,
  "propertyId" UUID,
  "tradeId" UUID,
  "buyOrderId" UUID,
  "sellOrderId" UUID,
  "documentId" UUID,
  "proofPayload" JSONB,
  "syncedAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BlockchainRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BlockchainRecord_entityType_entityId_recordType_createdAt_idx"
ON "BlockchainRecord"("entityType", "entityId", "recordType", "createdAt");

CREATE INDEX IF NOT EXISTS "BlockchainRecord_status_createdAt_idx"
ON "BlockchainRecord"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "BlockchainRecord_txHash_idx"
ON "BlockchainRecord"("txHash");

CREATE INDEX IF NOT EXISTS "BlockchainRecord_propertyId_idx"
ON "BlockchainRecord"("propertyId");

CREATE INDEX IF NOT EXISTS "BlockchainRecord_tradeId_idx"
ON "BlockchainRecord"("tradeId");

CREATE INDEX IF NOT EXISTS "BlockchainRecord_buyOrderId_idx"
ON "BlockchainRecord"("buyOrderId");

CREATE INDEX IF NOT EXISTS "BlockchainRecord_sellOrderId_idx"
ON "BlockchainRecord"("sellOrderId");

CREATE INDEX IF NOT EXISTS "BlockchainRecord_documentId_idx"
ON "BlockchainRecord"("documentId");

CREATE INDEX IF NOT EXISTS "BlockchainRecord_ownerUserId_idx"
ON "BlockchainRecord"("ownerUserId");

DO $$
BEGIN
  ALTER TABLE "BlockchainRecord"
    ADD CONSTRAINT "BlockchainRecord_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "BlockchainRecord"
    ADD CONSTRAINT "BlockchainRecord_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "BlockchainRecord"
    ADD CONSTRAINT "BlockchainRecord_tradeId_fkey"
    FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "BlockchainRecord"
    ADD CONSTRAINT "BlockchainRecord_buyOrderId_fkey"
    FOREIGN KEY ("buyOrderId") REFERENCES "BuyOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "BlockchainRecord"
    ADD CONSTRAINT "BlockchainRecord_sellOrderId_fkey"
    FOREIGN KEY ("sellOrderId") REFERENCES "SellOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "BlockchainRecord"
    ADD CONSTRAINT "BlockchainRecord_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
