import { SellOrderStrategy } from "@prisma/client";
import { clampSummary, summarizeCurrency } from "../formatters/summary.js";

export type SellPriceRecommendationPromptPayload = {
  property: {
    address1: string;
    city: string;
    state: string;
  };
  strategy: SellOrderStrategy;
  referencePrice: number;
  recommendedPrice: number;
  liquidityScore: number;
  latestListingPrice: number | null;
  recentTradeRange: {
    min: number;
    max: number;
    latest: number;
    tradeCount: number;
  } | null;
  openBuyInterest: {
    orderCount: number;
    topLimitBid: number | null;
  };
};

function getStrategyLabel(strategy: SellOrderStrategy) {
  if (strategy === "FAST_EXIT") return "fast exit";
  if (strategy === "MAX_PRICE") return "max price";
  return "balanced";
}

function getLiquidityTone(liquidityScore: number) {
  if (liquidityScore >= 70) return "strong";
  if (liquidityScore >= 50) return "moderate";
  return "thin";
}

export function buildSellPriceRecommendationPrompt(
  payload: SellPriceRecommendationPromptPayload
) {
  return JSON.stringify(
    {
      property: payload.property,
      pricingContext: {
        strategy: payload.strategy,
        referencePrice: payload.referencePrice,
        recommendedPrice: payload.recommendedPrice,
        liquidityScore: payload.liquidityScore,
        latestListingPrice: payload.latestListingPrice,
        recentTradeRange: payload.recentTradeRange,
        openBuyInterest: payload.openBuyInterest,
      },
    },
    null,
    2
  );
}

export function buildSellPriceRecommendationFallback(
  payload: SellPriceRecommendationPromptPayload
) {
  const liquidityNote = `Liquidity is currently ${getLiquidityTone(payload.liquidityScore)} with a score of ${payload.liquidityScore}.`;
  const strategyNote = `The ${getStrategyLabel(payload.strategy)} strategy supports a recommended ask of ${summarizeCurrency(payload.recommendedPrice)} per share against a reference price of ${summarizeCurrency(payload.referencePrice)}.`;
  const tradeNote = payload.recentTradeRange
    ? `Recent trades ranged from ${summarizeCurrency(payload.recentTradeRange.min)} to ${summarizeCurrency(payload.recentTradeRange.max)} per share across ${payload.recentTradeRange.tradeCount} trades.`
    : "There are no recent trades in the current lookback window, so the recommendation leans more heavily on the reference price and liquidity posture.";
  const demandNote = payload.openBuyInterest.topLimitBid
    ? `Open buy interest is present, with the strongest limit bid at ${summarizeCurrency(payload.openBuyInterest.topLimitBid)} per share.`
    : `Open buy demand is currently limited, with ${payload.openBuyInterest.orderCount} open buy orders and no priced limit bid to anchor the ask.`;

  return clampSummary(`${strategyNote} ${liquidityNote} ${tradeNote} ${demandNote}`);
}

export function getSellPriceRecommendationInstructions() {
  return "Explain a recommended sell price in 2 to 3 concise sentences. Mention strategy, liquidity, and recent market context. Do not invent data or change the numeric recommendation.";
}
