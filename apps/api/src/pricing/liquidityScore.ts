import { PrismaClient, SellOrderStatus } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export type LiquidityInputs = {
  tradeCount14d: number;
  avgTimeToFillHours?: number | null;
  avgAskDeviationPct?: number | null;
};

export type LiquidityScoreConfig = {
  tradeWeight: number;
  timeWeight: number;
  deviationWeight: number;
  tradeCountCap: number;
  timeToFillMaxHours: number;
};

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeLiquidityScore(
  inputs: LiquidityInputs,
  config: LiquidityScoreConfig
): number {
  const tradeCountCap = Math.max(1, config.tradeCountCap);
  const tradeScore =
    (Math.min(inputs.tradeCount14d, tradeCountCap) / tradeCountCap) *
    config.tradeWeight;

  const timeToFill = inputs.avgTimeToFillHours ?? null;
  let timeScore = config.timeWeight * 0.5;
  if (timeToFill !== null) {
    const maxHours = Math.max(1, config.timeToFillMaxHours);
    const clamped = Math.max(0, Math.min(maxHours, timeToFill));
    timeScore = ((maxHours - clamped) / maxHours) * config.timeWeight;
  }

  const deviation = inputs.avgAskDeviationPct ?? null;
  let deviationScore = config.deviationWeight * 0.4;
  if (deviation !== null) {
    if (deviation <= 1) deviationScore = config.deviationWeight;
    else if (deviation <= 3) deviationScore = config.deviationWeight * 0.8;
    else if (deviation <= 5) deviationScore = config.deviationWeight * 0.6;
    else if (deviation <= 10) deviationScore = config.deviationWeight * 0.32;
    else deviationScore = 0;
  }

  return clampScore(tradeScore + timeScore + deviationScore);
}

export async function updateLiquidityScore(
  prisma: PrismaClient,
  propertyId: string
) {
  const { getMarketRuleConfig } = await import("./marketRules.js");
  const config = await getMarketRuleConfig(prisma);
  const since = new Date(Date.now() - config.liquidityLookbackDays * DAY_MS);
  const trades = await prisma.trade.findMany({
    where: { propertyId, tradedAt: { gte: since } },
    select: { tradedAt: true },
  });
  const tradeCount14d = trades.length;

  const filledOrders = await prisma.sellOrder.findMany({
    where: { propertyId, status: SellOrderStatus.FILLED },
    include: { trades: { select: { tradedAt: true } } },
  });

  const fillTimes: number[] = [];
  for (const order of filledOrders) {
    if (!order.trades.length) continue;
    const latestTrade = order.trades.reduce((max, t) =>
      t.tradedAt > max ? t.tradedAt : max
    , order.trades[0].tradedAt);
    const hours = (latestTrade.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60);
    if (hours >= 0) fillTimes.push(hours);
  }
  const avgTimeToFillHours =
    fillTimes.length > 0
      ? fillTimes.reduce((sum, h) => sum + h, 0) / fillTimes.length
      : null;

  const shareClass = await prisma.shareClass.findUnique({
    where: { propertyId },
    select: { referencePricePerShare: true },
  });
  const referencePrice = shareClass ? Number(shareClass.referencePricePerShare) : null;

  const openOrders = await prisma.sellOrder.findMany({
    where: { propertyId, status: SellOrderStatus.OPEN },
    select: { askPricePerShare: true },
  });

  let avgAskDeviationPct: number | null = null;
  if (referencePrice && openOrders.length > 0) {
    const deviations = openOrders.map((order) =>
      Math.abs((Number(order.askPricePerShare) - referencePrice) / referencePrice) * 100
    );
    avgAskDeviationPct =
      deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
  }

  const liquidityScore = computeLiquidityScore(
    {
      tradeCount14d,
      avgTimeToFillHours,
      avgAskDeviationPct,
    },
    {
      tradeWeight: config.liquidityTradeWeight,
      timeWeight: config.liquidityTimeWeight,
      deviationWeight: config.liquidityDeviationWeight,
      tradeCountCap: config.liquidityTradeCountCap,
      timeToFillMaxHours: config.liquidityTimeToFillMaxHours,
    }
  );

  return prisma.property.update({
    where: { id: propertyId },
    data: { liquidityScore },
  });
}
