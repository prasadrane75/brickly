import {
  Prisma,
  PrismaClient,
  BuyOrderStatus,
  SellOrderStatus,
  BuyOrderType,
} from "@prisma/client";

export type MatchCandidate = {
  buyOrderId: string;
  sellOrderId: string;
  shares: number;
  pricePerShare: number;
};

export type MatchPreview = {
  matches: MatchCandidate[];
  buyOrders: {
    id: string;
    orderType: BuyOrderType;
    maxPricePerShare: number | null;
    remainingShares: number;
    createdAt: Date;
  }[];
  sellOrders: {
    id: string;
    askPricePerShare: number;
    remainingShares: number;
    createdAt: Date;
  }[];
};

export async function buildMatchPreview(
  prisma: PrismaClient | Prisma.TransactionClient,
  propertyId: string
): Promise<MatchPreview> {
  const sellOrders = await prisma.sellOrder.findMany({
    where: {
      propertyId,
      status: { in: [SellOrderStatus.OPEN, SellOrderStatus.PARTIAL] },
      remainingShares: { gt: 0 },
    },
    orderBy: [{ askPricePerShare: "asc" }, { createdAt: "asc" }],
  });

  const buyOrders = await prisma.buyOrder.findMany({
    where: {
      propertyId,
      status: { in: [BuyOrderStatus.OPEN, BuyOrderStatus.PARTIAL] },
    },
    orderBy: { createdAt: "asc" },
  });

  const buyList = buyOrders
    .map((order) => ({
      id: order.id,
      orderType: order.orderType,
      maxPricePerShare: order.maxPricePerShare
        ? Number(order.maxPricePerShare)
        : null,
      remainingShares: order.sharesRequested - order.filledShares,
      createdAt: order.createdAt,
    }))
    .filter((order) => order.remainingShares > 0)
    .sort((a, b) => {
      if (a.orderType !== b.orderType) {
        return a.orderType === BuyOrderType.MARKET ? -1 : 1;
      }
      const aPrice = a.maxPricePerShare ?? 0;
      const bPrice = b.maxPricePerShare ?? 0;
      if (aPrice !== bPrice) return bPrice - aPrice;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  const sellList = sellOrders.map((order) => ({
    id: order.id,
    askPricePerShare: Number(order.askPricePerShare),
    remainingShares: order.remainingShares,
    createdAt: order.createdAt,
  }));

  const matches: MatchCandidate[] = [];

  for (const buy of buyList) {
    let remainingBuy = buy.remainingShares;
    for (const sell of sellList) {
      if (remainingBuy <= 0) break;
      if (sell.remainingShares <= 0) continue;

      if (
        buy.orderType === BuyOrderType.LIMIT &&
        (buy.maxPricePerShare ?? 0) < sell.askPricePerShare
      ) {
        continue;
      }

      const shares = Math.min(remainingBuy, sell.remainingShares);
      remainingBuy -= shares;
      sell.remainingShares -= shares;

      matches.push({
        buyOrderId: buy.id,
        sellOrderId: sell.id,
        shares,
        pricePerShare: sell.askPricePerShare,
      });
    }
  }

  return { matches, buyOrders: buyList, sellOrders: sellList };
}
