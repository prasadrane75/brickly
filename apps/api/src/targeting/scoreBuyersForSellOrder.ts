import { PrismaClient, UserRole } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export type BuyerScore = {
  buyerUserId: string;
  score: number;
};

export type TargetingConfig = {
  ownsPropertyWeight: number;
  viewScorePerCount: number;
  maxViewScore: number;
  similarHoldingsWeight: number;
  recentBuyerWeight: number;
  minScoreToTarget: number;
  maxBuyersPerOrder: number;
  cooldownHours: number;
};

const defaultConfig: TargetingConfig = {
  ownsPropertyWeight: 40,
  viewScorePerCount: 6,
  maxViewScore: 30,
  similarHoldingsWeight: 20,
  recentBuyerWeight: 10,
  minScoreToTarget: 1,
  maxBuyersPerOrder: 20,
  cooldownHours: 0,
};

export function computeBuyerScore(params: {
  ownsProperty: boolean;
  viewCount: number;
  hasSimilarHoldings: boolean;
  recentBuyer: boolean;
  config: TargetingConfig;
}) {
  let score = 0;
  const config = params.config;
  if (params.ownsProperty) score += config.ownsPropertyWeight;
  if (params.viewCount > 0) {
    score += Math.min(
      config.maxViewScore,
      params.viewCount * config.viewScorePerCount
    );
  }
  if (params.hasSimilarHoldings) score += config.similarHoldingsWeight;
  if (params.recentBuyer) score += config.recentBuyerWeight;
  return score;
}

export async function getTargetingConfig(prisma: PrismaClient) {
  const existing = await prisma.targetingRuleConfig.findFirst({
    where: { name: "default" },
  });
  if (existing) {
    return {
      ownsPropertyWeight: existing.ownsPropertyWeight,
      viewScorePerCount: existing.viewScorePerCount,
      maxViewScore: existing.maxViewScore,
      similarHoldingsWeight: existing.similarHoldingsWeight,
      recentBuyerWeight: existing.recentBuyerWeight,
      minScoreToTarget: existing.minScoreToTarget,
      maxBuyersPerOrder: existing.maxBuyersPerOrder,
      cooldownHours: existing.cooldownHours,
    };
  }

  const created = await prisma.targetingRuleConfig.create({
    data: {
      name: "default",
      ownsPropertyWeight: defaultConfig.ownsPropertyWeight,
      viewScorePerCount: defaultConfig.viewScorePerCount,
      maxViewScore: defaultConfig.maxViewScore,
      similarHoldingsWeight: defaultConfig.similarHoldingsWeight,
      recentBuyerWeight: defaultConfig.recentBuyerWeight,
      minScoreToTarget: defaultConfig.minScoreToTarget,
      maxBuyersPerOrder: defaultConfig.maxBuyersPerOrder,
      cooldownHours: defaultConfig.cooldownHours,
    },
  });
  return {
    ownsPropertyWeight: created.ownsPropertyWeight,
    viewScorePerCount: created.viewScorePerCount,
    maxViewScore: created.maxViewScore,
    similarHoldingsWeight: created.similarHoldingsWeight,
    recentBuyerWeight: created.recentBuyerWeight,
    minScoreToTarget: created.minScoreToTarget,
    maxBuyersPerOrder: created.maxBuyersPerOrder,
    cooldownHours: created.cooldownHours,
  };
}

export async function scoreBuyersForSellOrder(
  prisma: PrismaClient,
  sellOrderId: string
): Promise<BuyerScore[]> {
  const sellOrder = await prisma.sellOrder.findUnique({
    where: { id: sellOrderId },
    include: { property: true },
  });
  if (!sellOrder) {
    throw new Error("SELL_ORDER_NOT_FOUND");
  }

  const candidates = await prisma.user.findMany({
    where: {
      id: { not: sellOrder.userId },
      role: { in: [UserRole.INVESTOR, UserRole.LISTER, UserRole.ADMIN] },
    },
    select: { id: true },
  });

  const candidateIds = candidates.map((c) => c.id);
  if (candidateIds.length === 0) return [];

  const since = new Date(Date.now() - 14 * DAY_MS);

  const holdingsInProperty = await prisma.holding.findMany({
    where: {
      userId: { in: candidateIds },
      sharesOwned: { gt: 0 },
      shareClass: { propertyId: sellOrder.propertyId },
    },
    select: { userId: true },
  });
  const ownsSet = new Set(holdingsInProperty.map((h) => h.userId));

  const similarHoldings = await prisma.holding.findMany({
    where: {
      userId: { in: candidateIds },
      sharesOwned: { gt: 0 },
      shareClass: {
        property: {
          city: sellOrder.property.city,
          state: sellOrder.property.state,
        },
      },
    },
    select: { userId: true },
  });
  const similarSet = new Set(similarHoldings.map((h) => h.userId));

  const views = await prisma.propertyView.findMany({
    where: {
      userId: { in: candidateIds },
      propertyId: sellOrder.propertyId,
      lastViewedAt: { gte: since },
    },
    select: { userId: true, viewCount: true },
  });
  const viewMap = new Map<string, number>();
  for (const view of views) {
    viewMap.set(view.userId, view.viewCount);
  }

  const config = await getTargetingConfig(prisma);

  const recentBuys = await prisma.trade.findMany({
    where: {
      buyerUserId: { in: candidateIds },
      tradedAt: { gte: since },
    },
    select: { buyerUserId: true },
  });
  const recentSet = new Set(recentBuys.map((t) => t.buyerUserId));

  const scores = candidateIds.map((buyerUserId) => {
    const score = computeBuyerScore({
      ownsProperty: ownsSet.has(buyerUserId),
      viewCount: viewMap.get(buyerUserId) ?? 0,
      hasSimilarHoldings: similarSet.has(buyerUserId),
      recentBuyer: recentSet.has(buyerUserId),
      config,
    });
    return { buyerUserId, score };
  });

  return scores
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}
