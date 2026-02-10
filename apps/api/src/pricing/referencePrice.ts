import { PrismaClient } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export type TradeInput = {
  pricePerShare: number;
  sharesTraded: number;
  tradedAt?: Date;
};

export type ReferencePriceInputs = {
  primaryReference?: number | null;
  trades?: TradeInput[];
  listingAskingPrice?: number | null;
  totalShares?: number | null;
  weights?: {
    primary: number;
    secondary: number;
    nav: number;
  };
};

export function computeVwap(trades: TradeInput[] = []): number | null {
  if (!trades.length) return null;
  let totalShares = 0;
  let totalValue = 0;
  for (const trade of trades) {
    if (trade.sharesTraded <= 0) continue;
    totalShares += trade.sharesTraded;
    totalValue += trade.pricePerShare * trade.sharesTraded;
  }
  if (totalShares <= 0) return null;
  return Number((totalValue / totalShares).toFixed(4));
}

export function computeNavProxy(
  askingPrice?: number | null,
  totalShares?: number | null
): number | null {
  if (!askingPrice || !totalShares || totalShares <= 0) return null;
  return Number((askingPrice / totalShares).toFixed(4));
}

export function computeReferencePrice(inputs: ReferencePriceInputs): number | null {
  const primary = inputs.primaryReference ?? null;
  const vwap = computeVwap(inputs.trades ?? []);
  const nav = computeNavProxy(inputs.listingAskingPrice ?? null, inputs.totalShares ?? null);
  const weights = inputs.weights ?? { primary: 0.4, secondary: 0.4, nav: 0.2 };

  const components: { value: number; weight: number }[] = [];
  if (primary !== null) components.push({ value: primary, weight: weights.primary });
  if (vwap !== null) components.push({ value: vwap, weight: weights.secondary });
  if (nav !== null) components.push({ value: nav, weight: weights.nav });

  if (components.length === 0) return null;
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const weighted =
    components.reduce((sum, c) => sum + c.value * c.weight, 0) / totalWeight;
  return Number(weighted.toFixed(4));
}

export async function updateReferencePrice(
  prisma: PrismaClient,
  propertyId: string
) {
  const { getMarketRuleConfig } = await import("./marketRules.js");
  const config = await getMarketRuleConfig(prisma);
  const shareClass = await prisma.shareClass.findUnique({
    where: { propertyId },
  });
  if (!shareClass) {
    throw new Error("SHARE_CLASS_NOT_FOUND");
  }

  const listing = await prisma.listing.findFirst({
    where: { propertyId, status: "LISTED" },
    orderBy: { postedAt: "desc" },
    select: { askingPrice: true },
  });

  const since = new Date(Date.now() - config.liquidityLookbackDays * DAY_MS);
  const trades = await prisma.trade.findMany({
    where: { propertyId, tradedAt: { gte: since } },
    select: { pricePerShare: true, sharesTraded: true },
  });

  const referencePrice = computeReferencePrice({
    primaryReference: Number(shareClass.referencePricePerShare),
    trades: trades.map((t) => ({
      pricePerShare: Number(t.pricePerShare),
      sharesTraded: t.sharesTraded,
    })),
    listingAskingPrice: listing ? Number(listing.askingPrice) : null,
    totalShares: shareClass.totalShares,
    weights: {
      primary: config.referenceWeightPrimary,
      secondary: config.referenceWeightSecondary,
      nav: config.referenceWeightNav,
    },
  });

  if (referencePrice === null) {
    return shareClass;
  }

  return prisma.shareClass.update({
    where: { id: shareClass.id },
    data: {
      referencePricePerShare: referencePrice,
      lastReferenceUpdateAt: new Date(),
    },
  });
}
