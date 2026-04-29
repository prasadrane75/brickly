CREATE TABLE "TargetingRuleConfig" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ownsPropertyWeight" INTEGER NOT NULL DEFAULT 40,
    "viewScorePerCount" INTEGER NOT NULL DEFAULT 6,
    "maxViewScore" INTEGER NOT NULL DEFAULT 30,
    "similarHoldingsWeight" INTEGER NOT NULL DEFAULT 20,
    "recentBuyerWeight" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TargetingRuleConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TargetingRuleConfig_name_key" ON "TargetingRuleConfig"("name");
