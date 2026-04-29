type NumericLike = number | string | { toString(): string };

type HoldingInput = {
  sharesOwned: number;
  shareClass: {
    totalShares: number;
    referencePricePerShare: NumericLike;
    property: {
      id: string;
      address1: string;
      city: string;
      state: string;
      estMonthlyRent: NumericLike | null;
    };
  };
};

type TradeInput = {
  propertyId: string;
  buyerUserId: string;
  sharesTraded: number;
  pricePerShare: NumericLike;
};

export function asNumber(value: NumericLike | null | undefined) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function computeHoldingInvestedAmount(
  holding: HoldingInput,
  userId: string,
  trades: TradeInput[]
) {
  const buyTrades = trades.filter(
    (trade) =>
      trade.buyerUserId === userId &&
      trade.propertyId === holding.shareClass.property.id
  );

  if (buyTrades.length === 0) {
    return holding.sharesOwned * asNumber(holding.shareClass.referencePricePerShare);
  }

  const totalBoughtShares = buyTrades.reduce(
    (sum, trade) => sum + trade.sharesTraded,
    0
  );
  const totalBoughtAmount = buyTrades.reduce(
    (sum, trade) => sum + trade.sharesTraded * asNumber(trade.pricePerShare),
    0
  );

  const averageCostBasis =
    totalBoughtShares > 0
      ? totalBoughtAmount / totalBoughtShares
      : asNumber(holding.shareClass.referencePricePerShare);

  return holding.sharesOwned * averageCostBasis;
}

export function computeHoldingEstimatedIncome(holding: HoldingInput) {
  const totalShares = holding.shareClass.totalShares || 0;
  if (totalShares <= 0) return 0;
  const ownershipFraction = holding.sharesOwned / totalShares;
  return ownershipFraction * asNumber(holding.shareClass.property.estMonthlyRent);
}

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
