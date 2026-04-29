export type LiquidityInsightPayload = {
  property: {
    id: string;
    address1: string;
    liquidityScore: number;
  };
  metrics: {
    recentTradeCount: number;
    openBuyOrders: number;
    openSellOrders: number;
    holderConcentrationPct: number;
  };
  heuristic: {
    expectedExitTime: string;
    demandIndicator: string;
  };
};

export function buildLiquidityInsightPrompt(payload: LiquidityInsightPayload) {
  return JSON.stringify(payload, null, 2);
}

export function buildLiquidityInsightFallback(payload: LiquidityInsightPayload) {
  return {
    liquidityScore: payload.property.liquidityScore,
    expectedExitTime: payload.heuristic.expectedExitTime,
    demandIndicator: payload.heuristic.demandIndicator,
    explanation:
      `${payload.property.address1} currently has a liquidity score of ${payload.property.liquidityScore}. ` +
      `Recent trades: ${payload.metrics.recentTradeCount}, open buy orders: ${payload.metrics.openBuyOrders}, ` +
      `open sell orders: ${payload.metrics.openSellOrders}, top-holder concentration: ${payload.metrics.holderConcentrationPct}%. ` +
      `This is an estimate and should be treated as marketplace guidance rather than a guarantee.`,
  };
}

export function getLiquidityInsightInstructions() {
  return [
    "Explain liquidity in simple investor language using only the supplied metrics.",
    "State clearly that liquidity is an estimate.",
    "Return valid JSON with keys: liquidityScore, expectedExitTime, demandIndicator, explanation.",
  ].join(" ");
}
