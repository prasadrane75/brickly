import { BuyOrderStatus, Prisma, SellOrderStatus, UserRole } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../shared/http/apiError.js";
import { aiRepository } from "../../repositories/ai.repository.js";
import { portfolioService } from "../operational/portfolio.service.js";
import { transactionService } from "../operational/transaction.service.js";
import {
  buildDocumentSummaryFallback,
  buildDocumentSummaryPrompt,
  getDocumentSummaryInstructions,
} from "./promptBuilders/documentSummary.js";
import {
  buildPortfolioSummaryFallback,
  buildPortfolioSummaryPrompt,
  getPortfolioSummaryInstructions,
} from "./promptBuilders/portfolioSummary.js";
import {
  buildTransactionExplanationFallback,
  buildTransactionExplanationPrompt,
  getTransactionExplanationInstructions,
} from "./promptBuilders/transactionExplanation.js";
import {
  buildOwnershipSummaryFallback,
  buildOwnershipSummaryPrompt,
  getOwnershipSummaryInstructions,
} from "./promptBuilders/ownershipSummary.js";
import {
  buildAuditSummaryFallback,
  buildAuditSummaryPrompt,
  getAuditSummaryInstructions,
} from "./promptBuilders/auditSummary.js";
import {
  buildAnomalyDetectionFallback,
  buildAnomalyDetectionPrompt,
  getAnomalyDetectionInstructions,
} from "./promptBuilders/anomalyDetection.js";
import {
  buildLiquidityInsightFallback,
  buildLiquidityInsightPrompt,
  getLiquidityInsightInstructions,
} from "./promptBuilders/liquidityInsight.js";
import {
  buildSellPriceRecommendationFallback,
  buildSellPriceRecommendationPrompt,
  getSellPriceRecommendationInstructions,
  type SellPriceRecommendationPromptPayload,
} from "./promptBuilders/sellPriceRecommendation.js";
import { logAiDebug } from "./formatters/debug.js";
import { normalizeStringArray, parseJsonObject } from "./formatters/json.js";
import { getAiRuntimeConfig } from "./providers/provider-factory.js";
import type {
  AiProviderName,
  AiServiceStatus,
  AiSummaryResponse,
  GeneratedSummaryResult,
} from "./types/index.js";
import { blockchainService } from "../blockchain/index.js";
import { propertyRepository } from "../../repositories/property.repository.js";
import { auditService } from "../operational/audit.service.js";
import { transactionRepository } from "../../repositories/transaction.repository.js";

const AI_PROMPT_VERSIONS = {
  portfolioSummary: "portfolio-summary-v1",
  documentSummary: "document-summary-v1",
  transactionExplanation: "transaction-explanation-v1",
} as const;

type AiTransactionExplanationResponse = {
  headline: string;
  explanation: string;
  verificationStatus: string;
  trustNote: string;
  impactSummary: string;
  relatedProperty: string;
  transactionStatusNote: string;
  provider: AiProviderName;
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

type AiPortfolioInsightResponse = AiSummaryResponse & {
  trustScore: number;
  verificationCoverage: number;
  verifiedVsUnverified: {
    verified: number;
    unverified: number;
  };
  riskNotes: string[];
};

type AiDocumentSummaryResponse = {
  summary: string;
  keyPoints: string[];
  keyDates: string[];
  potentialRisks: string[];
  actionItems: string[];
  provider: AiProviderName;
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

type AiOwnershipSummaryResponse = {
  summary: string;
  majorChanges: string[];
  currentOwnershipBreakdown: Array<{
    holder: string;
    sharesOwned: number;
    sharePercent: number;
    verified: boolean;
  }>;
  trustIndicator: string;
  provider: AiProviderName;
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

type AiAuditSummaryResponse = {
  summary: string;
  keyEvents: string[];
  anomalies: string[];
  verificationCoverage: number;
  provider: AiProviderName;
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

type AiAnomalyDetectionResponse = {
  anomalies: Array<{
    title: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
    explanation: string;
    category: string;
    referenceId: string | null;
  }>;
  severity: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  explanation: string;
  provider: AiProviderName;
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

type AiLiquidityInsightResponse = {
  liquidityScore: number;
  expectedExitTime: string;
  demandIndicator: string;
  explanation: string;
  provider: AiProviderName;
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

function coerceJsonObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeProviderName(value: string): AiProviderName {
  if (value === "openai" || value === "ollama" || value === "deterministic") {
    return value;
  }

  return "deterministic";
}

function getFallbackResult(input: {
  fallback: string;
  cachedAt: string;
  reason: string;
  errorMessage?: string | null;
}): GeneratedSummaryResult {
  return {
    summary: input.fallback,
    provider: "deterministic",
    model: "deterministic-fallback",
    cachedAt: input.cachedAt,
    source: "fallback",
    rawResponse: {
      status: "fallback",
      reason: input.reason,
    } satisfies Prisma.JsonObject,
    errorMessage: input.errorMessage ?? null,
  };
}

async function createStructuredSummary<T extends Record<string, unknown>>(input: {
  instructions: string;
  content: string;
  fallback: T;
  context: string;
  normalize: (payload: Record<string, unknown>, fallback: T) => T;
}): Promise<
  T & {
    provider: AiProviderName;
    model: string;
    cachedAt: string;
    source: "generated" | "fallback";
    rawResponse?: Prisma.JsonValue;
    errorMessage?: string | null;
  }
> {
  const generated = await createSummary({
    instructions: input.instructions,
    content: input.content,
    fallback: JSON.stringify(input.fallback),
    context: input.context,
  });

  let normalized = input.fallback;
  if (generated.source === "generated") {
    try {
      normalized = input.normalize(parseJsonObject(generated.summary), input.fallback);
    } catch {
      normalized = input.fallback;
    }
  }

  return {
    ...normalized,
    provider: normalizeProviderName(generated.provider),
    model: generated.model,
    cachedAt: generated.cachedAt,
    source: generated.source,
    rawResponse: generated.rawResponse,
    errorMessage: generated.errorMessage,
  };
}

async function createSummary(input: {
  instructions: string;
  content: string;
  fallback: string;
  context: string;
}): Promise<GeneratedSummaryResult> {
  const cachedAt = new Date().toISOString();
  const runtime = getAiRuntimeConfig();
  const provider = runtime.provider;

  if (!env.aiEnabled) {
    return getFallbackResult({
      fallback: input.fallback,
      cachedAt,
      reason: "ai_disabled",
    });
  }

  if (!provider.isConfigured()) {
    return getFallbackResult({
      fallback: input.fallback,
      cachedAt,
      reason: `${provider.name}_not_configured`,
    });
  }

  try {
    const result = await provider.generateText({
      instructions: input.instructions,
      content: input.content,
    });

    return {
      summary: result.summary,
      provider: runtime.providerName,
      model: runtime.model,
      cachedAt,
      source: "generated",
      rawResponse: result.rawResponse,
      errorMessage: null,
    };
  } catch (error) {
    logAiDebug(`Falling back to deterministic summary for ${input.context}:`, error);
    return getFallbackResult({
      fallback: input.fallback,
      cachedAt,
      reason: "provider_error",
      errorMessage: error instanceof Error ? error.message : "Unknown AI provider error",
    });
  }
}

function getCacheValidUntil(input: { requestType: "PORTFOLIO_SUMMARY" | "DOCUMENT_SUMMARY" }) {
  const now = Date.now();

  if (input.requestType === "PORTFOLIO_SUMMARY") {
    return new Date(now + 5 * 60 * 1000);
  }

  return new Date(now + 24 * 60 * 60 * 1000);
}

function getTransactionCacheValidUntil() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

function normalizeTransactionExplanation(
  payload: Record<string, unknown>,
  fallback: Omit<AiTransactionExplanationResponse, "provider" | "model" | "cachedAt" | "source">
) {
  const getString = (value: unknown, fallbackValue: string) =>
    typeof value === "string" && value.trim() ? value.trim() : fallbackValue;

  return {
    headline: getString(payload.headline, fallback.headline),
    explanation: getString(payload.explanation, fallback.explanation),
    verificationStatus: getString(payload.verificationStatus, fallback.verificationStatus),
    trustNote: getString(payload.trustNote, fallback.trustNote),
    impactSummary: getString(payload.impactSummary, fallback.impactSummary),
    relatedProperty: getString(payload.relatedProperty, fallback.relatedProperty),
    transactionStatusNote: getString(payload.transactionStatusNote, fallback.transactionStatusNote),
  };
}

function normalizePortfolioInsight(
  payload: Record<string, unknown>,
  fallback: Omit<AiPortfolioInsightResponse, "provider" | "model" | "cachedAt" | "source">
) {
  const verifiedVsUnverified = coerceJsonObject(payload.verifiedVsUnverified);
  return {
    summary:
      typeof payload.summary === "string" && payload.summary.trim()
        ? payload.summary.trim()
        : fallback.summary,
    trustScore:
      typeof payload.trustScore === "number" ? Math.round(payload.trustScore) : fallback.trustScore,
    verificationCoverage:
      typeof payload.verificationCoverage === "number"
        ? Math.round(payload.verificationCoverage)
        : fallback.verificationCoverage,
    verifiedVsUnverified: {
      verified:
        typeof verifiedVsUnverified?.verified === "number"
          ? Math.round(verifiedVsUnverified.verified)
          : fallback.verifiedVsUnverified.verified,
      unverified:
        typeof verifiedVsUnverified?.unverified === "number"
          ? Math.round(verifiedVsUnverified.unverified)
          : fallback.verifiedVsUnverified.unverified,
    },
    riskNotes: normalizeStringArray(payload.riskNotes, fallback.riskNotes),
  };
}

function normalizeOwnershipSummary(
  payload: Record<string, unknown>,
  fallback: Omit<AiOwnershipSummaryResponse, "provider" | "model" | "cachedAt" | "source">
) {
  const breakdown = Array.isArray(payload.currentOwnershipBreakdown)
    ? payload.currentOwnershipBreakdown
        .map((item) => coerceJsonObject(item))
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map((item) => ({
          holder: typeof item.holder === "string" ? item.holder : "Unknown holder",
          sharesOwned:
            typeof item.sharesOwned === "number" ? Math.round(item.sharesOwned) : 0,
          sharePercent:
            typeof item.sharePercent === "number" ? Number(item.sharePercent.toFixed(2)) : 0,
          verified: Boolean(item.verified),
        }))
    : fallback.currentOwnershipBreakdown;

  return {
    summary:
      typeof payload.summary === "string" && payload.summary.trim()
        ? payload.summary.trim()
        : fallback.summary,
    majorChanges: normalizeStringArray(payload.majorChanges, fallback.majorChanges),
    currentOwnershipBreakdown: breakdown,
    trustIndicator:
      typeof payload.trustIndicator === "string" && payload.trustIndicator.trim()
        ? payload.trustIndicator.trim()
        : fallback.trustIndicator,
  };
}

function normalizeAuditSummary(
  payload: Record<string, unknown>,
  fallback: Omit<AiAuditSummaryResponse, "provider" | "model" | "cachedAt" | "source">
) {
  return {
    summary:
      typeof payload.summary === "string" && payload.summary.trim()
        ? payload.summary.trim()
        : fallback.summary,
    keyEvents: normalizeStringArray(payload.keyEvents, fallback.keyEvents),
    anomalies: normalizeStringArray(payload.anomalies, fallback.anomalies),
    verificationCoverage:
      typeof payload.verificationCoverage === "number"
        ? Math.round(payload.verificationCoverage)
        : fallback.verificationCoverage,
  };
}

function normalizeAnomalyDetection(
  payload: Record<string, unknown>,
  fallback: Omit<AiAnomalyDetectionResponse, "provider" | "model" | "cachedAt" | "source">
) {
  const anomalies: AiAnomalyDetectionResponse["anomalies"] = Array.isArray(payload.anomalies)
    ? payload.anomalies
        .map((item) => coerceJsonObject(item))
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map((item) => ({
          title: typeof item.title === "string" ? item.title : "Flagged anomaly",
          severity:
            item.severity === "HIGH" || item.severity === "MEDIUM" || item.severity === "LOW"
              ? item.severity
              : "LOW",
          explanation:
            typeof item.explanation === "string" ? item.explanation : "Review flagged data.",
          category: typeof item.category === "string" ? item.category : "GENERAL",
          referenceId:
            typeof item.referenceId === "string" ? item.referenceId : null,
        }))
    : fallback.anomalies;

  return {
    anomalies,
    severity:
      payload.severity === "HIGH" ||
      payload.severity === "MEDIUM" ||
      payload.severity === "LOW" ||
      payload.severity === "NONE"
        ? payload.severity
        : fallback.severity,
    explanation:
      typeof payload.explanation === "string" && payload.explanation.trim()
        ? payload.explanation.trim()
        : fallback.explanation,
  };
}

function normalizeLiquidityInsight(
  payload: Record<string, unknown>,
  fallback: Omit<AiLiquidityInsightResponse, "provider" | "model" | "cachedAt" | "source">
) {
  return {
    liquidityScore:
      typeof payload.liquidityScore === "number"
        ? Math.round(payload.liquidityScore)
        : fallback.liquidityScore,
    expectedExitTime:
      typeof payload.expectedExitTime === "string" && payload.expectedExitTime.trim()
        ? payload.expectedExitTime.trim()
        : fallback.expectedExitTime,
    demandIndicator:
      typeof payload.demandIndicator === "string" && payload.demandIndicator.trim()
        ? payload.demandIndicator.trim()
        : fallback.demandIndicator,
    explanation:
      typeof payload.explanation === "string" && payload.explanation.trim()
        ? payload.explanation.trim()
        : fallback.explanation,
  };
}

function normalizeDocumentSummary(
  payload: Record<string, unknown>,
  fallback: Omit<AiDocumentSummaryResponse, "provider" | "model" | "cachedAt" | "source">
) {
  const getString = (value: unknown, fallbackValue: string) =>
    typeof value === "string" && value.trim() ? value.trim() : fallbackValue;

  return {
    summary: getString(payload.summary, fallback.summary),
    keyPoints: normalizeStringArray(payload.keyPoints, fallback.keyPoints),
    keyDates: normalizeStringArray(payload.keyDates, fallback.keyDates),
    potentialRisks: normalizeStringArray(payload.potentialRisks, fallback.potentialRisks),
    actionItems: normalizeStringArray(payload.actionItems, fallback.actionItems),
  };
}

function mapCachedSummaryResponse(
  request: { provider: string; model: string; createdAt: Date },
  response: { renderedText: string | null }
): AiSummaryResponse | null {
  if (!response.renderedText) {
    return null;
  }

  return {
    summary: response.renderedText,
    provider: normalizeProviderName(request.provider),
    model: request.model,
    cachedAt: request.createdAt.toISOString(),
    source: "generated",
  };
}

function mapCachedDocumentSummary(
  request: { provider: string; model: string; createdAt: Date },
  response: { formattedResponse: Prisma.JsonValue | null; renderedText: string | null }
): AiDocumentSummaryResponse | null {
  const formatted = coerceJsonObject(response.formattedResponse);
  if (!formatted) {
    if (!response.renderedText) {
      return null;
    }

    return {
      summary: response.renderedText,
      keyPoints: [],
      keyDates: [],
      potentialRisks: [],
      actionItems: [],
      provider: normalizeProviderName(request.provider),
      model: request.model,
      cachedAt: request.createdAt.toISOString(),
      source: "generated",
    };
  }

  return {
    summary: typeof formatted.summary === "string" ? formatted.summary : response.renderedText ?? "",
    keyPoints: normalizeStringArray(formatted.keyPoints),
    keyDates: normalizeStringArray(formatted.keyDates),
    potentialRisks: normalizeStringArray(formatted.potentialRisks),
    actionItems: normalizeStringArray(formatted.actionItems),
    provider: normalizeProviderName(request.provider),
    model: request.model,
    cachedAt: request.createdAt.toISOString(),
    source: "generated",
  };
}

function mapCachedTransactionExplanation(
  request: { provider: string; model: string; createdAt: Date },
  response: { formattedResponse: Prisma.JsonValue | null; renderedText: string | null }
): AiTransactionExplanationResponse | null {
  const formatted = coerceJsonObject(response.formattedResponse);
  if (!formatted) {
    return null;
  }

  return {
    headline: typeof formatted.headline === "string" ? formatted.headline : "",
    explanation: typeof formatted.explanation === "string" ? formatted.explanation : response.renderedText ?? "",
    verificationStatus:
      typeof formatted.verificationStatus === "string" ? formatted.verificationStatus : "UNVERIFIED",
    trustNote: typeof formatted.trustNote === "string" ? formatted.trustNote : "",
    impactSummary:
      typeof formatted.impactSummary === "string" ? formatted.impactSummary : "",
    relatedProperty:
      typeof formatted.relatedProperty === "string" ? formatted.relatedProperty : "",
    transactionStatusNote:
      typeof formatted.transactionStatusNote === "string" ? formatted.transactionStatusNote : "",
    provider: normalizeProviderName(request.provider),
    model: request.model,
    cachedAt: request.createdAt.toISOString(),
    source: "generated",
  };
}

export const aiService: {
  status: AiServiceStatus;
  summarizePortfolio(input: { userId: string }): Promise<AiPortfolioInsightResponse>;
  summarizeDocument(input: { documentId: string; userId: string; role: string }): Promise<AiDocumentSummaryResponse>;
  explainTransaction(input: { transactionId: string; userId: string; role: UserRole }): Promise<AiTransactionExplanationResponse>;
  summarizeOwnership(input: { propertyId: string }): Promise<AiOwnershipSummaryResponse>;
  summarizeAudit(input: {
    limit?: number;
    action?: string;
    actorType?: string;
    entityType?: string;
  }): Promise<AiAuditSummaryResponse>;
  detectAnomalies(input: { propertyId?: string; limit?: number }): Promise<AiAnomalyDetectionResponse>;
  explainLiquidity(input: { propertyId: string }): Promise<AiLiquidityInsightResponse>;
  explainSellPriceRecommendation(input: SellPriceRecommendationPromptPayload): Promise<AiSummaryResponse>;
} = {
  status: getAiRuntimeConfig().isReady ? "ready" : "fallback",

  async summarizePortfolio({ userId }) {
    const summaryPayload = await portfolioService.getSummary(userId);
    const holdings = summaryPayload.currentHoldings;
    const verifiedCount = holdings.filter((holding) => holding.property.blockchainVerified).length;
    const unverifiedCount = Math.max(0, holdings.length - verifiedCount);
    const verificationCoverage =
      holdings.length > 0 ? Math.round((verifiedCount / holdings.length) * 100) : 0;
    const trustScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          verificationCoverage * 0.7 +
            (summaryPayload.recentTransactions.filter((trade) => trade.blockchainVerified).length > 0 ? 20 : 0) +
            (summaryPayload.user.kycStatus === "APPROVED" ? 10 : 0)
        )
      )
    );
    const riskNotes = [
      ...(unverifiedCount > 0
        ? [`${unverifiedCount} holdings still rely on operational records without verified blockchain proof.`]
        : ["All current holdings in this portfolio are backed by verified property-level proof."]),
      ...(summaryPayload.recentTransactions.some((trade) => !trade.blockchainVerified)
        ? ["Recent transaction history includes entries that remain pending verification."]
        : []),
    ];
    const enrichedSummaryPayload = {
      ...summaryPayload,
      trustMetrics: {
        trustScore,
        verificationCoverage,
        verifiedCount,
        unverifiedCount,
        riskNotes,
      },
    };
    const portfolioCacheKey = `portfolio-summary:${userId}:${AI_PROMPT_VERSIONS.portfolioSummary}`;
    const cached = await aiRepository.findLatestValidByCacheKey(portfolioCacheKey);
    if (cached?.response) {
      const formatted = coerceJsonObject(cached.response.formattedResponse);
      const cachedResult: AiPortfolioInsightResponse | null = formatted
        ? ({
            ...normalizePortfolioInsight(formatted, buildPortfolioSummaryFallback(enrichedSummaryPayload)),
            provider: normalizeProviderName(cached.provider),
            model: cached.model,
            cachedAt: cached.createdAt.toISOString(),
            source: "generated",
          } satisfies AiPortfolioInsightResponse)
        : mapCachedSummaryResponse(cached, cached.response)
          ? {
              ...(normalizePortfolioInsight(
                { summary: cached.response.renderedText },
                buildPortfolioSummaryFallback(enrichedSummaryPayload)
              ) as Omit<AiPortfolioInsightResponse, "provider" | "model" | "cachedAt" | "source">),
              provider: normalizeProviderName(cached.provider),
              model: cached.model,
              cachedAt: cached.createdAt.toISOString(),
              source: "generated",
            }
          : null;
      if (cachedResult) {
        return cachedResult;
      }
    }

    const runtime = getAiRuntimeConfig();
    const request = await aiRepository.createRequest({
      userId,
      requestType: "PORTFOLIO_SUMMARY",
      entityType: "USER",
      entityId: userId,
      promptVersion: AI_PROMPT_VERSIONS.portfolioSummary,
      provider: runtime.providerName,
      model: runtime.model,
      cacheKey: portfolioCacheKey,
      promptInput: enrichedSummaryPayload as Prisma.InputJsonValue,
    });

    const fallback = buildPortfolioSummaryFallback(enrichedSummaryPayload);
    const generated = await createStructuredSummary({
      instructions: getPortfolioSummaryInstructions(),
      content: buildPortfolioSummaryPrompt(enrichedSummaryPayload),
      fallback,
      context: `portfolio user ${userId}`,
      normalize: normalizePortfolioInsight,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { aiSummaryCache: generated.summary },
    });

    await aiRepository.completeRequest(request.id, {
      provider: generated.provider,
      model: generated.model,
      cacheValidUntil: getCacheValidUntil({ requestType: "PORTFOLIO_SUMMARY" }),
      errorMessage: generated.errorMessage,
      rawResponse: generated.rawResponse as Prisma.InputJsonValue | undefined,
      formattedResponse: {
        summary: generated.summary,
        trustScore: generated.trustScore,
        verificationCoverage: generated.verificationCoverage,
        verifiedVsUnverified: generated.verifiedVsUnverified,
        riskNotes: generated.riskNotes,
        source: generated.source,
        provider: generated.provider,
        model: generated.model,
      } satisfies Prisma.JsonObject,
      renderedText: generated.summary,
    });

    return generated;
  },

  async summarizeDocument({ documentId, userId, role }) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        property: {
          select: { address1: true, city: true, state: true },
        },
        uploadedBy: {
          select: { id: true },
        },
      },
    });

    if (!document) {
      throw new ApiError(404, "NOT_FOUND", "Document not found");
    }

    if (role !== "ADMIN" && document.uploadedByUserId !== userId) {
      throw new ApiError(403, "FORBIDDEN", "Not allowed to summarize this document");
    }

    const documentCacheKey = `document-summary:${documentId}:${AI_PROMPT_VERSIONS.documentSummary}`;
    const cached = await aiRepository.findLatestValidByCacheKey(documentCacheKey);
    if (cached?.response && document.updatedAt <= cached.createdAt) {
      const cachedResult = mapCachedDocumentSummary(cached, cached.response);
      if (cachedResult) {
        return cachedResult;
      }
    }

    const runtime = getAiRuntimeConfig();
    const request = await aiRepository.createRequest({
      userId,
      requestType: "DOCUMENT_SUMMARY",
      entityType: "DOCUMENT",
      entityId: documentId,
      promptVersion: AI_PROMPT_VERSIONS.documentSummary,
      provider: runtime.providerName,
      model: runtime.model,
      cacheKey: documentCacheKey,
      promptInput: {
        documentId: document.id,
        fileName: document.fileName,
        kind: document.kind,
        status: document.status,
        property: document.property,
        metadata: document.metadata,
      } satisfies Prisma.InputJsonObject,
    });

    const fallback = buildDocumentSummaryFallback(document);
    const generated = await createStructuredSummary({
      instructions: getDocumentSummaryInstructions(),
      content: buildDocumentSummaryPrompt(document),
      fallback,
      context: `document ${documentId}`,
      normalize: normalizeDocumentSummary,
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { aiSummaryCache: generated.summary },
    });

    await aiRepository.completeRequest(request.id, {
      provider: generated.provider,
      model: generated.model,
      cacheValidUntil: getCacheValidUntil({ requestType: "DOCUMENT_SUMMARY" }),
      errorMessage: generated.errorMessage,
      rawResponse: generated.rawResponse as Prisma.InputJsonValue | undefined,
      formattedResponse: {
        summary: generated.summary,
        keyPoints: generated.keyPoints,
        keyDates: generated.keyDates,
        potentialRisks: generated.potentialRisks,
        actionItems: generated.actionItems,
      } satisfies Prisma.JsonObject,
      renderedText: generated.summary,
    });

    return {
      ...generated,
      provider: generated.provider,
      model: generated.model,
      cachedAt: generated.cachedAt,
      source: generated.source,
    };
  },

  async explainTransaction({ transactionId, userId, role }) {
    const transaction = await transactionService.getDetail({ userId, role }, transactionId);
    const transactionCacheKey = `transaction-explanation:${transactionId}:${AI_PROMPT_VERSIONS.transactionExplanation}`;
    const cached = await aiRepository.findLatestValidByCacheKey(transactionCacheKey);
    if (cached?.response) {
      const cachedResult = mapCachedTransactionExplanation(cached, cached.response);
      if (cachedResult) {
        return cachedResult;
      }
    }

    const fallback = buildTransactionExplanationFallback({
      id: transaction.id,
      tradedAt: transaction.tradedAt,
      sharesTraded: transaction.sharesTraded,
      pricePerShare: transaction.pricePerShare,
      totalAmount: transaction.totalAmount,
      direction: transaction.direction as "BUY" | "SELL",
      verificationStatus: transaction.verificationStatus,
      property: transaction.property,
      sellOrder: transaction.sellOrder,
      blockchain: {
        verificationStatus: "UNVERIFIED",
        blockchainRef: null,
        latestRecordStatus: null,
        note: "",
      },
    });
    const verification = await blockchainService.getTransactionVerification(
      { userId, role },
      transactionId
    );
    const structuredFallback = buildTransactionExplanationFallback({
      id: transaction.id,
      tradedAt: transaction.tradedAt,
      sharesTraded: transaction.sharesTraded,
      pricePerShare: transaction.pricePerShare,
      totalAmount: transaction.totalAmount,
      direction: transaction.direction as "BUY" | "SELL",
      verificationStatus: transaction.verificationStatus,
      property: transaction.property,
      sellOrder: transaction.sellOrder,
      blockchain: {
        verificationStatus: verification.verificationStatus,
        blockchainRef: verification.blockchainRef,
        latestRecordStatus: verification.latestRecord?.status ?? null,
        note: verification.note,
      },
    });
    const runtime = getAiRuntimeConfig();
    const request = await aiRepository.createRequest({
      userId,
      requestType: "TRANSACTION_EXPLANATION",
      entityType: "TRANSACTION",
      entityId: transactionId,
      promptVersion: AI_PROMPT_VERSIONS.transactionExplanation,
      provider: runtime.providerName,
      model: runtime.model,
      cacheKey: transactionCacheKey,
      promptInput: transaction as Prisma.InputJsonValue,
    });

    const generated = await createStructuredSummary({
      instructions: getTransactionExplanationInstructions(),
      content: buildTransactionExplanationPrompt({
        id: transaction.id,
        tradedAt: transaction.tradedAt,
        sharesTraded: transaction.sharesTraded,
        pricePerShare: transaction.pricePerShare,
        totalAmount: transaction.totalAmount,
        direction: transaction.direction as "BUY" | "SELL",
        verificationStatus: transaction.verificationStatus,
        property: transaction.property,
        sellOrder: transaction.sellOrder,
        blockchain: {
          verificationStatus: verification.verificationStatus,
          blockchainRef: verification.blockchainRef,
          latestRecordStatus: verification.latestRecord?.status ?? null,
          note: verification.note,
        },
      }),
      fallback: structuredFallback,
      context: `transaction ${transactionId}`,
      normalize: normalizeTransactionExplanation,
    });

    const explanationText = `${generated.headline}\n\n${generated.explanation}`;
    await prisma.trade.update({
      where: { id: transactionId },
      data: { aiSummaryCache: explanationText },
    });

    await aiRepository.completeRequest(request.id, {
      provider: generated.provider,
      model: generated.model,
      cacheValidUntil: getTransactionCacheValidUntil(),
      errorMessage: generated.errorMessage,
      rawResponse: generated.rawResponse as Prisma.InputJsonValue | undefined,
      formattedResponse: {
        headline: generated.headline,
        explanation: generated.explanation,
        verificationStatus: generated.verificationStatus,
        trustNote: generated.trustNote,
        impactSummary: generated.impactSummary,
        relatedProperty: generated.relatedProperty,
        transactionStatusNote: generated.transactionStatusNote,
      } satisfies Prisma.JsonObject,
      renderedText: explanationText,
    });

    return {
      ...generated,
      provider: generated.provider,
      model: generated.model,
      cachedAt: generated.cachedAt,
      source: generated.source,
    };
  },

  async summarizeOwnership({ propertyId }) {
    const property = await propertyRepository.findDetailById(propertyId);
    if (!property) {
      throw new ApiError(404, "NOT_FOUND", "Property not found");
    }

    const [trades, holdings, verification] = await Promise.all([
      transactionRepository.findMany({ propertyId }, 0, 25),
      property.shareClass
        ? prisma.holding.findMany({
            where: { shareClassId: property.shareClass.id, sharesOwned: { gt: 0 } },
            include: {
              user: { select: { email: true, phone: true, id: true } },
            },
            orderBy: { sharesOwned: "desc" },
          })
        : Promise.resolve([]),
      blockchainService.getPropertyVerification(propertyId),
    ]);

    const payload = {
      property: {
        id: property.id,
        address1: property.address1,
        city: property.city,
        state: property.state,
        verificationStatus: verification.verificationStatus,
        blockchainRef: verification.blockchainRef,
      },
      shareClass: property.shareClass
        ? {
            totalShares: property.shareClass.totalShares,
            sharesAvailable: property.shareClass.sharesAvailable,
            referencePricePerShare: Number(property.shareClass.referencePricePerShare),
          }
        : null,
      events: trades.map((trade) => ({
        id: trade.id,
        tradedAt: trade.tradedAt.toISOString(),
        sharesTraded: trade.sharesTraded,
        buyerLabel: trade.buyer.email || trade.buyer.id,
        sellerLabel: trade.seller.email || trade.seller.id,
        verificationStatus: trade.verificationStatus,
        blockchainRef: trade.blockchainTxHash,
      })),
      holdings: holdings.map((holding) => ({
        holderLabel: holding.user.email || holding.user.phone || holding.user.id,
        sharesOwned: holding.sharesOwned,
        sharePercent:
          property.shareClass && property.shareClass.totalShares > 0
            ? Number(((holding.sharesOwned / property.shareClass.totalShares) * 100).toFixed(2))
            : 0,
        verified: verification.verificationStatus === "VERIFIED",
      })),
    };

    return createStructuredSummary({
      instructions: getOwnershipSummaryInstructions(),
      content: buildOwnershipSummaryPrompt(payload),
      fallback: buildOwnershipSummaryFallback(payload),
      context: `ownership summary ${propertyId}`,
      normalize: normalizeOwnershipSummary,
    });
  },

  async summarizeAudit({ limit = 25, action, actorType, entityType }) {
    const auditResult = await auditService.list(
      { action, actorType, entityType },
      { skip: 0, take: limit, page: 1, pageSize: limit }
    );

    const logs = auditResult.items;
    const relatedProofs = logs.flatMap((log) => [log.propertyProof, log.tradeProof]).filter(Boolean);
    const verifiedProofs = relatedProofs.filter((proof) => proof?.verificationStatus === "VERIFIED").length;
    const verificationCoverage =
      relatedProofs.length > 0 ? Math.round((verifiedProofs / relatedProofs.length) * 100) : 0;
    const anomalyHints = logs
      .filter(
        (log) =>
          (log.tradeProof && log.tradeProof.verificationStatus !== "VERIFIED") ||
          (log.propertyProof && log.propertyProof.verificationStatus !== "VERIFIED")
      )
      .slice(0, 5)
      .map((log) => `${log.summary} is missing full verification coverage.`);

    const payload = {
      logs: logs.map((log) => ({
        action: log.action,
        entityType: log.entityType,
        summary: log.summary,
        createdAt: log.createdAt.toISOString(),
        tradeProofStatus: log.tradeProof?.verificationStatus ?? null,
        propertyProofStatus: log.propertyProof?.verificationStatus ?? null,
      })),
      verificationCoverage,
      anomalyHints,
    };

    return createStructuredSummary({
      instructions: getAuditSummaryInstructions(),
      content: buildAuditSummaryPrompt(payload),
      fallback: buildAuditSummaryFallback(payload),
      context: "audit summary",
      normalize: normalizeAuditSummary,
    });
  },

  async detectAnomalies({ propertyId, limit = 20 }) {
    const trades = await prisma.trade.findMany({
      where: propertyId ? { propertyId } : undefined,
      include: {
        property: { select: { address1: true } },
      },
      orderBy: { tradedAt: "desc" },
      take: Math.max(limit, 25),
    });

    const shareClasses = await prisma.shareClass.findMany({
      where: propertyId ? { propertyId } : undefined,
      include: {
        property: { select: { id: true, address1: true } },
        holdings: { select: { sharesOwned: true } },
      },
    });

    const anomalies: Array<{
      category: string;
      severity: "LOW" | "MEDIUM" | "HIGH";
      title: string;
      referenceId: string | null;
      detail: string;
    }> = [];

    for (const trade of trades.filter((item) => item.verificationStatus !== "VERIFIED").slice(0, limit)) {
      anomalies.push({
        category: "VERIFICATION_GAP",
        severity: "MEDIUM",
        title: "Transaction without verified blockchain proof",
        referenceId: trade.id,
        detail: `${trade.property.address1} trade ${trade.id} remains ${trade.verificationStatus.toLowerCase()} without a confirmed blockchain proof.`,
      });
    }

    for (const shareClass of shareClasses) {
      const heldShares = shareClass.holdings.reduce((sum, holding) => sum + holding.sharesOwned, 0);
      const ledgerTotal = heldShares + shareClass.sharesAvailable;
      if (ledgerTotal !== shareClass.totalShares) {
        anomalies.push({
          category: "OWNERSHIP_TOTAL_MISMATCH",
          severity: "HIGH",
          title: "Ownership totals do not reconcile",
          referenceId: shareClass.property.id,
          detail: `${shareClass.property.address1} shows ${ledgerTotal} combined held and available shares versus ${shareClass.totalShares} configured total shares.`,
        });
      }
    }

    const pairCounts = new Map<string, { count: number; tradeId: string; propertyName: string }>();
    for (const trade of trades) {
      const key = `${trade.buyerUserId}:${trade.sellerUserId}:${trade.propertyId}`;
      const current = pairCounts.get(key);
      if (current) {
        current.count += 1;
      } else {
        pairCounts.set(key, { count: 1, tradeId: trade.id, propertyName: trade.property.address1 });
      }
    }

    for (const [, pair] of pairCounts) {
      if (pair.count >= 3) {
        anomalies.push({
          category: "UNUSUAL_TRANSFER_PATTERN",
          severity: "LOW",
          title: "Repeated transfer pattern detected",
          referenceId: pair.tradeId,
          detail: `${pair.propertyName} has ${pair.count} repeated transfers between the same counterparties in the recent ledger sample.`,
        });
      }
    }

    const fallback = buildAnomalyDetectionFallback({ anomalies: anomalies.slice(0, limit) });
    return createStructuredSummary({
      instructions: getAnomalyDetectionInstructions(),
      content: buildAnomalyDetectionPrompt({ anomalies: anomalies.slice(0, limit) }),
      fallback,
      context: "anomaly detection",
      normalize: normalizeAnomalyDetection,
    });
  },

  async explainLiquidity({ propertyId }) {
    const property = await propertyRepository.findDetailById(propertyId);
    if (!property) {
      throw new ApiError(404, "NOT_FOUND", "Property not found");
    }

    const [openBuyOrders, openSellOrders, holdings] = await Promise.all([
      prisma.buyOrder.count({
        where: { propertyId, status: { in: [BuyOrderStatus.OPEN, BuyOrderStatus.PARTIAL] } },
      }),
      prisma.sellOrder.count({
        where: { propertyId, status: { in: [SellOrderStatus.OPEN, SellOrderStatus.PARTIAL] } },
      }),
      property.shareClass
        ? prisma.holding.findMany({
            where: { shareClassId: property.shareClass.id, sharesOwned: { gt: 0 } },
            select: { sharesOwned: true },
          })
        : Promise.resolve([]),
    ]);

    const recentTradeCount = property._count.trades;
    const maxHolding = holdings.reduce((max, holding) => Math.max(max, holding.sharesOwned), 0);
    const holderConcentrationPct =
      property.shareClass && property.shareClass.totalShares > 0
        ? Number(((maxHolding / property.shareClass.totalShares) * 100).toFixed(1))
        : 0;
    const demandIndicator =
      openBuyOrders > openSellOrders
        ? "Buyer-led"
        : openBuyOrders === openSellOrders
          ? "Balanced"
          : "Seller-heavy";
    const expectedExitTime =
      property.liquidityScore >= 75
        ? "1 to 3 weeks"
        : property.liquidityScore >= 50
          ? "1 to 2 months"
          : "2 to 4 months";

    const payload = {
      property: {
        id: property.id,
        address1: property.address1,
        liquidityScore: property.liquidityScore,
      },
      metrics: {
        recentTradeCount,
        openBuyOrders,
        openSellOrders,
        holderConcentrationPct,
      },
      heuristic: {
        expectedExitTime,
        demandIndicator,
      },
    };

    return createStructuredSummary({
      instructions: getLiquidityInsightInstructions(),
      content: buildLiquidityInsightPrompt(payload),
      fallback: buildLiquidityInsightFallback(payload),
      context: `liquidity insight ${propertyId}`,
      normalize: normalizeLiquidityInsight,
    });
  },

  async explainSellPriceRecommendation(input) {
    return createSummary({
      instructions: getSellPriceRecommendationInstructions(),
      content: buildSellPriceRecommendationPrompt(input),
      fallback: buildSellPriceRecommendationFallback(input),
      context: `sell recommendation ${input.property.address1}`,
    });
  },
};
