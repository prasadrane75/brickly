DO $$
BEGIN
  CREATE TYPE "AuditActorType" AS ENUM ('USER', 'ADMIN', 'SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AuditAction" AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'APPROVE',
    'REJECT',
    'LOGIN',
    'EXPORT',
    'CONFIG_CHANGE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PlatformConfigScope" AS ENUM (
    'PLATFORM',
    'MARKET',
    'COMPLIANCE',
    'ANALYTICS',
    'AI',
    'BLOCKCHAIN'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  "id" UUID NOT NULL,
  "actorUserId" UUID,
  "actorType" "AuditActorType" NOT NULL DEFAULT 'ADMIN',
  "action" "AuditAction" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "targetUserId" UUID,
  "propertyId" UUID,
  "tradeId" UUID,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminAuditLog_actorUserId_idx" ON "AdminAuditLog"("actorUserId");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_actorType_action_idx" ON "AdminAuditLog"("actorType", "action");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_targetUserId_idx" ON "AdminAuditLog"("targetUserId");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_propertyId_idx" ON "AdminAuditLog"("propertyId");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_tradeId_idx" ON "AdminAuditLog"("tradeId");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

DO $$
BEGIN
  ALTER TABLE "AdminAuditLog"
    ADD CONSTRAINT "AdminAuditLog_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PlatformConfig" (
  "id" UUID NOT NULL,
  "scope" "PlatformConfigScope" NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "aiSummaryCache" TEXT,
  "blockchainTxHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformConfig_scope_key_key" ON "PlatformConfig"("scope", "key");
CREATE INDEX IF NOT EXISTS "PlatformConfig_scope_isActive_idx" ON "PlatformConfig"("scope", "isActive");
