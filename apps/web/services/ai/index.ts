import { apiFetch } from "../api/client";
import type { ApiResponse } from "../../shared/api-types";

export type AiSummaryResult = {
  summary: string;
  provider: "openai" | "deterministic";
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
  provider: "openai" | "deterministic";
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

export type AiTransactionExplanationResult = {
  headline: string;
  explanation: string;
  impactSummary: string;
  relatedProperty: string;
  transactionStatusNote: string;
  provider: "openai" | "deterministic";
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
};
