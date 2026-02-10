import { PrismaClient } from "@prisma/client";

export type MarketRuleConfig = {
  liquidityGoodThreshold: number;
  liquidityMidThreshold: number;
  liquidityLookbackDays: number;
  liquidityTradeWeight: number;
  liquidityTimeWeight: number;
  liquidityDeviationWeight: number;
  liquidityTradeCountCap: number;
  liquidityTimeToFillMaxHours: number;
  referenceWeightPrimary: number;
  referenceWeightSecondary: number;
  referenceWeightNav: number;
  strategyMultiplierFastExit: number;
  strategyMultiplierBalanced: number;
  strategyMultiplierMaxPrice: number;
  maxPriceCapMultiplier: number;
};

const defaultConfig: MarketRuleConfig = {
  liquidityGoodThreshold: 70,
  liquidityMidThreshold: 50,
  liquidityLookbackDays: 14,
  liquidityTradeWeight: 40,
  liquidityTimeWeight: 35,
  liquidityDeviationWeight: 25,
  liquidityTradeCountCap: 10,
  liquidityTimeToFillMaxHours: 7 * 24,
  referenceWeightPrimary: 0.4,
  referenceWeightSecondary: 0.4,
  referenceWeightNav: 0.2,
  strategyMultiplierFastExit: 0.95,
  strategyMultiplierBalanced: 1.0,
  strategyMultiplierMaxPrice: 1.03,
  maxPriceCapMultiplier: 1.2,
};

export async function getMarketRuleConfig(prisma: PrismaClient) {
  const existing = await prisma.marketRuleConfig.findFirst({
    where: { name: "default" },
  });
  if (existing) {
    return {
      liquidityGoodThreshold: existing.liquidityGoodThreshold,
      liquidityMidThreshold: existing.liquidityMidThreshold,
      liquidityLookbackDays: existing.liquidityLookbackDays,
      liquidityTradeWeight: existing.liquidityTradeWeight,
      liquidityTimeWeight: existing.liquidityTimeWeight,
      liquidityDeviationWeight: existing.liquidityDeviationWeight,
      liquidityTradeCountCap: existing.liquidityTradeCountCap,
      liquidityTimeToFillMaxHours: existing.liquidityTimeToFillMaxHours,
      referenceWeightPrimary: Number(existing.referenceWeightPrimary),
      referenceWeightSecondary: Number(existing.referenceWeightSecondary),
      referenceWeightNav: Number(existing.referenceWeightNav),
      strategyMultiplierFastExit: Number(existing.strategyMultiplierFastExit),
      strategyMultiplierBalanced: Number(existing.strategyMultiplierBalanced),
      strategyMultiplierMaxPrice: Number(existing.strategyMultiplierMaxPrice),
      maxPriceCapMultiplier: Number(existing.maxPriceCapMultiplier),
    };
  }

  const created = await prisma.marketRuleConfig.create({
    data: {
      name: "default",
      liquidityGoodThreshold: defaultConfig.liquidityGoodThreshold,
      liquidityMidThreshold: defaultConfig.liquidityMidThreshold,
      liquidityLookbackDays: defaultConfig.liquidityLookbackDays,
      liquidityTradeWeight: defaultConfig.liquidityTradeWeight,
      liquidityTimeWeight: defaultConfig.liquidityTimeWeight,
      liquidityDeviationWeight: defaultConfig.liquidityDeviationWeight,
      liquidityTradeCountCap: defaultConfig.liquidityTradeCountCap,
      liquidityTimeToFillMaxHours: defaultConfig.liquidityTimeToFillMaxHours,
      referenceWeightPrimary: defaultConfig.referenceWeightPrimary,
      referenceWeightSecondary: defaultConfig.referenceWeightSecondary,
      referenceWeightNav: defaultConfig.referenceWeightNav,
      strategyMultiplierFastExit: defaultConfig.strategyMultiplierFastExit,
      strategyMultiplierBalanced: defaultConfig.strategyMultiplierBalanced,
      strategyMultiplierMaxPrice: defaultConfig.strategyMultiplierMaxPrice,
      maxPriceCapMultiplier: defaultConfig.maxPriceCapMultiplier,
    },
  });

  return {
    liquidityGoodThreshold: created.liquidityGoodThreshold,
    liquidityMidThreshold: created.liquidityMidThreshold,
    liquidityLookbackDays: created.liquidityLookbackDays,
    liquidityTradeWeight: created.liquidityTradeWeight,
    liquidityTimeWeight: created.liquidityTimeWeight,
    liquidityDeviationWeight: created.liquidityDeviationWeight,
    liquidityTradeCountCap: created.liquidityTradeCountCap,
    liquidityTimeToFillMaxHours: created.liquidityTimeToFillMaxHours,
    referenceWeightPrimary: Number(created.referenceWeightPrimary),
    referenceWeightSecondary: Number(created.referenceWeightSecondary),
    referenceWeightNav: Number(created.referenceWeightNav),
    strategyMultiplierFastExit: Number(created.strategyMultiplierFastExit),
    strategyMultiplierBalanced: Number(created.strategyMultiplierBalanced),
    strategyMultiplierMaxPrice: Number(created.strategyMultiplierMaxPrice),
    maxPriceCapMultiplier: Number(created.maxPriceCapMultiplier),
  };
}
