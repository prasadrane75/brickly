import { apiFetch } from "../api/client";
import type { ApiResponse } from "../../shared/api-types";

type AiProvider = "openai" | "ollama" | "deterministic";

export type AiSummaryResult = {
  summary: string;
  trustScore: number;
  verificationCoverage: number;
  verifiedVsUnverified: {
    verified: number;
    unverified: number;
  };
  riskNotes: string[];
  provider: AiProvider;
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

export type AiDocumentSummaryResult = {
  summary: string;
  keyPoints: string[];
  keyDates: string[];
  potentialRisks: string[];
  actionItems: string[];
  provider: AiProvider;
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

export type AiTransactionExplanationResult = {
  headline: string;
  explanation: string;
  verificationStatus: string;
  trustNote: string;
  impactSummary: string;
  relatedProperty: string;
  transactionStatusNote: string;
  provider: AiProvider;
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

export type AiOwnershipSummaryResult = {
  summary: string;
  majorChanges: string[];
  currentOwnershipBreakdown: Array<{
    holder: string;
    sharesOwned: number;
    sharePercent: number;
    verified: boolean;
  }>;
  trustIndicator: string;
  provider: AiProvider;
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

export type AiAuditSummaryResult = {
  summary: string;
  keyEvents: string[];
  anomalies: string[];
  verificationCoverage: number;
  provider: AiProvider;
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

export type AiAnomalyDetectionResult = {
  anomalies: Array<{
    title: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    explanation: string;
    category: string;
    referenceId: string | null;
  }>;
  severity: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  explanation: string;
  provider: AiProvider;
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

export type AiLiquidityInsightResult = {
  liquidityScore: number;
  expectedExitTime: string;
  demandIndicator: string;
  explanation: string;
  provider: AiProvider;
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

export const aiClient = {
  async summarizePortfolio() {
    const response = await apiFetch<ApiResponse<AiSummaryResult>>(
      "/v1/portfolio/summary/ai",
      {
        method: "POST",
      }
    );

    return response.data;
  },

  async summarizeDocument(documentId: string) {
    const response = await apiFetch<ApiResponse<AiDocumentSummaryResult>>(
      `/v1/documents/${documentId}/summarize`,
      {
        method: "POST",
      }
    );

    return response.data;
  },

  async explainTransaction(transactionId: string) {
    const response = await apiFetch<ApiResponse<AiTransactionExplanationResult>>(
      "/v1/ai/explain-transaction",
      {
        method: "POST",
        body: JSON.stringify({ transactionId }),
      }
    );

    return response.data;
  },

  async summarizeOwnership(propertyId: string) {
    const response = await apiFetch<ApiResponse<AiOwnershipSummaryResult>>(
      "/v1/ai/ownership-summary",
      {
        method: "POST",
        body: JSON.stringify({ propertyId }),
      }
    );

    return response.data;
  },

  async summarizeAudit(filters?: {
    limit?: number;
    action?: string;
    actorType?: string;
    entityType?: string;
  }) {
    const response = await apiFetch<ApiResponse<AiAuditSummaryResult>>("/v1/ai/audit-summary", {
      method: "POST",
      body: JSON.stringify(filters ?? {}),
    });

    return response.data;
  },

  async detectAnomalies(filters?: { propertyId?: string; limit?: number }) {
    const response = await apiFetch<ApiResponse<AiAnomalyDetectionResult>>(
      "/v1/ai/anomaly-detection",
      {
        method: "POST",
        body: JSON.stringify(filters ?? {}),
      }
    );

    return response.data;
  },

  async explainLiquidity(propertyId: string) {
    const response = await apiFetch<ApiResponse<AiLiquidityInsightResult>>(
      "/v1/ai/liquidity-insight",
      {
        method: "POST",
        body: JSON.stringify({ propertyId }),
      }
    );

    return response.data;
  },
};
