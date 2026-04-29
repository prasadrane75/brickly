CREATE TABLE "MarketRuleConfig" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "liquidityGoodThreshold" INTEGER NOT NULL DEFAULT 70,
    "liquidityMidThreshold" INTEGER NOT NULL DEFAULT 50,
    "liquidityLookbackDays" INTEGER NOT NULL DEFAULT 14,
    "liquidityTradeWeight" INTEGER NOT NULL DEFAULT 40,
    "liquidityTimeWeight" INTEGER NOT NULL DEFAULT 35,
    "liquidityDeviationWeight" INTEGER NOT NULL DEFAULT 25,
    "liquidityTradeCountCap" INTEGER NOT NULL DEFAULT 10,
    "liquidityTimeToFillMaxHours" INTEGER NOT NULL DEFAULT 168,
    "referenceWeightPrimary" DECIMAL(4,3) NOT NULL DEFAULT 0.4,
    "referenceWeightSecondary" DECIMAL(4,3) NOT NULL DEFAULT 0.4,
    "referenceWeightNav" DECIMAL(4,3) NOT NULL DEFAULT 0.2,
    "strategyMultiplierFastExit" DECIMAL(6,3) NOT NULL DEFAULT 0.95,
    "strategyMultiplierBalanced" DECIMAL(6,3) NOT NULL DEFAULT 1.0,
    "strategyMultiplierMaxPrice" DECIMAL(6,3) NOT NULL DEFAULT 1.03,
    "maxPriceCapMultiplier" DECIMAL(6,3) NOT NULL DEFAULT 1.2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "MarketRuleConfig_name_key" ON "MarketRuleConfig"("name");
