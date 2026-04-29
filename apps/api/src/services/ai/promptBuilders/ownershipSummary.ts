import { clampSummary } from "../formatters/summary.js";

export type OwnershipSummaryPayload = {
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
    verificationStatus: string;
    blockchainRef: string | null;
  };
  shareClass: {
    totalShares: number;
    sharesAvailable: number;
    referencePricePerShare: number;
  } | null;
  events: Array<{
    id: string;
    tradedAt: string;
    sharesTraded: number;
    buyerLabel: string;
    sellerLabel: string;
    verificationStatus: string;
    blockchainRef: string | null;
  }>;
  holdings: Array<{
    holderLabel: string;
    sharesOwned: number;
    sharePercent: number;
    verified: boolean;
  }>;
};

export function buildOwnershipSummaryPrompt(payload: OwnershipSummaryPayload) {
  return JSON.stringify(payload, null, 2);
}

export function buildOwnershipSummaryFallback(payload: OwnershipSummaryPayload) {
  const verifiedEvents = payload.events.filter((event) => event.verificationStatus === "VERIFIED");
  const trustIndicator =
    payload.events.length === 0
      ? "No ownership transfer events are recorded yet."
      : verifiedEvents.length === payload.events.length
        ? "All tracked ownership events in this summary are blockchain-verified."
        : `${verifiedEvents.length} of ${payload.events.length} tracked ownership events are blockchain-verified.`;

  const majorChanges = payload.events.slice(0, 3).map((event) => {
    return `${event.tradedAt.slice(0, 10)}: ${event.sharesTraded} shares moved from ${event.sellerLabel} to ${event.buyerLabel} (${event.verificationStatus.toLowerCase()}).`;
  });

  const currentOwnershipBreakdown = payload.holdings.slice(0, 5).map((holding) => ({
    holder: holding.holderLabel,
    sharesOwned: holding.sharesOwned,
    sharePercent: holding.sharePercent,
    verified: holding.verified,
  }));

  return {
    summary: clampSummary(
      `${payload.property.address1} currently tracks ${payload.holdings.length} active holders in the operational ledger. ${trustIndicator}`
    ),
    majorChanges,
    currentOwnershipBreakdown,
    trustIndicator,
  };
}

export function getOwnershipSummaryInstructions() {
  return [
    "Summarize the ownership history in investor-friendly language.",
    "Use only the supplied operational and blockchain verification data.",
    "Highlight major verified and unverified changes without inventing new owners or events.",
    "Return valid JSON with keys: summary, majorChanges, currentOwnershipBreakdown, trustIndicator.",
    "majorChanges must be an array of short strings.",
    "currentOwnershipBreakdown must be an array of objects with keys: holder, sharesOwned, sharePercent, verified.",
  ].join(" ");
}
