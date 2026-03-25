-- Phase 2 AI persistence:
-- Keep aiSummaryCache on core entities as a lightweight surface cache, while
-- these tables provide request/response history, prompt versioning, and simple
-- cache reuse rules without changing operational source-of-truth models.

CREATE TYPE "AiRequestType" AS ENUM (
  'PORTFOLIO_SUMMARY',
  'TRANSACTION_EXPLANATION',
  'DOCUMENT_SUMMARY'
);

CREATE TYPE "AiRequestStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'FAILED'
);

CREATE TABLE "AiRequest" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "requestType" "AiRequestType" NOT NULL,
  "status" "AiRequestStatus" NOT NULL DEFAULT 'PENDING',
  "entityType" TEXT,
  "entityId" TEXT,
  "promptVersion" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "cacheKey" TEXT,
  "cacheValidUntil" TIMESTAMP(3),
  "promptInput" JSONB,
  "promptText" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "AiRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiResponse" (
  "id" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "rawResponse" JSONB,
  "formattedResponse" JSONB,
  "renderedText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiPromptTemplate" (
  "id" UUID NOT NULL,
  "requestType" "AiRequestType" NOT NULL,
  "name" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "provider" TEXT,
  "model" TEXT,
  "systemPrompt" TEXT,
  "template" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AiPromptTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiResponse_requestId_key" ON "AiResponse"("requestId");
CREATE UNIQUE INDEX "AiPromptTemplate_requestType_name_version_key" ON "AiPromptTemplate"("requestType", "name", "version");

CREATE INDEX "AiRequest_userId_requestType_createdAt_idx" ON "AiRequest"("userId", "requestType", "createdAt");
CREATE INDEX "AiRequest_requestType_entityType_entityId_createdAt_idx" ON "AiRequest"("requestType", "entityType", "entityId", "createdAt");
CREATE INDEX "AiRequest_status_createdAt_idx" ON "AiRequest"("status", "createdAt");
CREATE INDEX "AiRequest_cacheKey_cacheValidUntil_idx" ON "AiRequest"("cacheKey", "cacheValidUntil");
CREATE INDEX "AiResponse_createdAt_idx" ON "AiResponse"("createdAt");
CREATE INDEX "AiPromptTemplate_requestType_isActive_idx" ON "AiPromptTemplate"("requestType", "isActive");
CREATE INDEX "AiPromptTemplate_createdById_idx" ON "AiPromptTemplate"("createdById");

ALTER TABLE "AiRequest"
ADD CONSTRAINT "AiRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiResponse"
ADD CONSTRAINT "AiResponse_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "AiRequest"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiPromptTemplate"
ADD CONSTRAINT "AiPromptTemplate_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
