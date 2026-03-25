import { clampSummary, summarizeCurrency } from "../formatters/summary.js";

export type TransactionExplanationPayload = {
  id: string;
  tradedAt: Date;
  sharesTraded: number;
  pricePerShare: number;
  totalAmount: number;
  direction: "BUY" | "SELL";
  verificationStatus: string;
  property: {
    name: string;
    city: string;
    state: string;
  };
  sellOrder: {
    status: string;
    strategy: string;
    askPricePerShare: number;
    createdAt: Date;
  };
};

export function buildTransactionExplanationPrompt(data: TransactionExplanationPayload) {
  return JSON.stringify(
    {
      transaction: {
        id: data.id,
        tradedAt: data.tradedAt.toISOString(),
        direction: data.direction,
        sharesTraded: data.sharesTraded,
        pricePerShare: data.pricePerShare,
        totalAmount: data.totalAmount,
        verificationStatus: data.verificationStatus,
      },
      property: data.property,
      sellOrder: {
        status: data.sellOrder.status,
        strategy: data.sellOrder.strategy,
        askPricePerShare: data.sellOrder.askPricePerShare,
        createdAt: data.sellOrder.createdAt.toISOString(),
      },
    },
    null,
    2
  );
}

export function getTransactionExplanationInstructions() {
  return [
    "Explain the transaction in plain English for a non-technical investor.",
    "Keep it factual, concise, and grounded only in supplied transaction data.",
    "Do not provide financial advice.",
    "Return valid JSON with keys: headline, explanation, impactSummary, relatedProperty, transactionStatusNote.",
  ].join(" ");
}

export function buildTransactionExplanationFallback(data: TransactionExplanationPayload) {
  return {
    headline: `${data.direction} ${data.sharesTraded} shares in ${data.property.name}`,
    explanation: clampSummary(
      `This transaction records a ${data.direction.toLowerCase()} of ${data.sharesTraded} shares in ${data.property.name} at ${summarizeCurrency(data.pricePerShare)} per share, for a total of ${summarizeCurrency(data.totalAmount)}.`
    ),
    impactSummary:
      data.direction === "BUY"
        ? `This purchase increases your exposure to ${data.property.name}.`
        : `This sale reduces your exposure to ${data.property.name}.`,
    relatedProperty: `${data.property.name} in ${data.property.city}, ${data.property.state}`,
    transactionStatusNote:
      data.verificationStatus === "VERIFIED"
        ? "The transaction is marked as verified in the platform."
        : `The transaction is currently marked ${data.verificationStatus.toLowerCase()}.`,
  };
}
