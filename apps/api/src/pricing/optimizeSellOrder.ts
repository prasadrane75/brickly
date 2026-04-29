import { SellOrderStrategy } from "@prisma/client";

export type PricingConfig = {
  strategyMultiplierFastExit: number;
  strategyMultiplierBalanced: number;
  strategyMultiplierMaxPrice: number;
  maxPriceCapMultiplier: number;
};

const defaultPricingConfig: PricingConfig = {
  strategyMultiplierFastExit: 0.95,
  strategyMultiplierBalanced: 1.0,
  strategyMultiplierMaxPrice: 1.03,
  maxPriceCapMultiplier: 1.2,
};

export function liquidityAdjustment(liquidityScore: number) {
  if (liquidityScore >= 80) return 1.0;
  if (liquidityScore >= 60) return 0.98;
  if (liquidityScore >= 40) return 0.95;
  return 0.9;
}

export function strategyAdjustment(
  strategy: SellOrderStrategy,
  config: PricingConfig
) {
  if (strategy === "FAST_EXIT") return config.strategyMultiplierFastExit;
  if (strategy === "MAX_PRICE") return config.strategyMultiplierMaxPrice;
  return config.strategyMultiplierBalanced;
}

export function computeOptimizedPrice(params: {
  referencePrice: number;
  liquidityScore: number;
  strategy: SellOrderStrategy;
  config?: PricingConfig;
}) {
  const config = params.config ?? defaultPricingConfig;
  const base = params.referencePrice * liquidityAdjustment(params.liquidityScore);
  let optimized = base * strategyAdjustment(params.strategy, config);

  const maxCap = params.referencePrice * config.maxPriceCapMultiplier;
  if (params.strategy === "MAX_PRICE" && optimized > maxCap) {
    optimized = maxCap;
  }

  return Number(optimized.toFixed(4));
}
