import { summarizeCurrency, clampSummary } from "../formatters/summary.js";

export type PortfolioSummaryPayload = {
  generatedAt: string;
  user: {
    role: string;
    kycStatus: string | null;
  };
  summary: {
    totalPortfolioValue: number;
    totalPositions: number;
    estimatedAnnualIncome: number;
    totalUnrealizedChange: number;
    distinctProperties: number;
  };
  currentHoldings: Array<{
    estimatedValue: number;
    investedAmount: number;
    estimatedMonthlyIncome: number;
    allocationWeight: number;
    property: {
      name: string;
      city: string;
      state: string;
      status: string;
    };
  }>;
  recentTransactions: Array<unknown>;
  notificationsPreview: Array<unknown>;
  trustMetrics?: {
    trustScore: number;
    verificationCoverage: number;
    verifiedCount: number;
    unverifiedCount: number;
    riskNotes: string[];
  };
};

export function buildPortfolioSummaryPrompt(summary: PortfolioSummaryPayload) {
  const topHoldings = summary.currentHoldings.slice(0, 3).map((holding) => ({
    property: holding.property.name,
    market: `${holding.property.city}, ${holding.property.state}`,
    estimatedValue: holding.estimatedValue,
    investedAmount: holding.investedAmount,
    monthlyIncome: holding.estimatedMonthlyIncome,
    allocationWeight: holding.allocationWeight,
    status: holding.property.status,
  }));

  return JSON.stringify(
    {
      generatedAt: summary.generatedAt,
      investor: {
        role: summary.user.role,
        kycStatus: summary.user.kycStatus,
      },
      summary: summary.summary,
      trustMetrics: summary.trustMetrics,
      topHoldings,
      notificationsPreview: summary.notificationsPreview.slice(0, 3),
    },
    null,
    2
  );
}

export function buildPortfolioSummaryFallback(summary: PortfolioSummaryPayload) {
  const topHolding = summary.currentHoldings[0];
  const concentrationNote =
    topHolding && topHolding.allocationWeight >= 50
      ? `Concentration is elevated, with ${topHolding.property.name} representing ${topHolding.allocationWeight.toFixed(1)}% of current value.`
      : `Exposure is spread across ${summary.summary.distinctProperties} properties, which keeps concentration more balanced at the current scale.`;

  const activityNote =
    summary.recentTransactions.length > 0
      ? `Recent activity includes ${summary.recentTransactions.length} recorded trades in the latest portfolio feed.`
      : "No recent trades are present in the latest portfolio feed.";

  const trustScore = summary.trustMetrics?.trustScore ?? 0;
  const verificationCoverage = summary.trustMetrics?.verificationCoverage ?? 0;
  const riskNotes =
    summary.trustMetrics?.riskNotes.length
      ? summary.trustMetrics.riskNotes
      : ["Verification coverage remains mixed across current holdings."];

  return {
    summary: clampSummary(
      `Portfolio value stands at ${summarizeCurrency(summary.summary.totalPortfolioValue)} across ${summary.summary.totalPositions} positions, with ${summarizeCurrency(summary.summary.estimatedAnnualIncome)} in estimated annual income. ${concentrationNote} ${activityNote} Unrealized change versus invested capital is ${summarizeCurrency(summary.summary.totalUnrealizedChange)}.`
    ),
    trustScore,
    verificationCoverage,
    verifiedVsUnverified: {
      verified: summary.trustMetrics?.verifiedCount ?? 0,
      unverified: summary.trustMetrics?.unverifiedCount ?? summary.summary.totalPositions,
    },
    riskNotes,
  };
}

export function getPortfolioSummaryInstructions() {
  return [
    "Write a concise investor portfolio narrative in 3 to 4 sentences.",
    "Focus on value, income, concentration risk, notable recent activity, and verification trust.",
    "Do not invent facts.",
    "Return valid JSON with keys: summary, trustScore, verificationCoverage, verifiedVsUnverified, riskNotes.",
    "verifiedVsUnverified must contain numeric keys: verified and unverified.",
    "riskNotes must be an array of short strings.",
  ].join(" ");
}
