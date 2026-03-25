import { Prisma, UserRole } from "@prisma/client";
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
import { logAiDebug } from "./formatters/debug.js";
import { normalizeStringArray, parseJsonObject } from "./formatters/json.js";
import { getAiProvider, getAiRuntimeConfig } from "./providers/provider-factory.js";
import type {
  AiProviderName,
  AiServiceStatus,
  AiSummaryResponse,
  GeneratedSummaryResult,
} from "./types/index.js";

const AI_PROMPT_VERSIONS = {
  portfolioSummary: "portfolio-summary-v1",
  documentSummary: "document-summary-v1",
  transactionExplanation: "transaction-explanation-v1",
} as const;

type AiTransactionExplanationResponse = {
  headline: string;
  explanation: string;
  impactSummary: string;
  relatedProperty: string;
  transactionStatusNote: string;
  provider: string;
  model: string;
  cachedAt: string;
  source: "generated" | "fallback";
};

type AiDocumentSummaryResponse = {
  summary: string;
  keyPoints: string[];
  keyDates: string[];
  potentialRisks: string[];
  actionItems: string[];
  provider: string;
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
    impactSummary: getString(payload.impactSummary, fallback.impactSummary),
    relatedProperty: getString(payload.relatedProperty, fallback.relatedProperty),
    transactionStatusNote: getString(payload.transactionStatusNote, fallback.transactionStatusNote),
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
  summarizePortfolio(input: { userId: string }): Promise<AiSummaryResponse>;
  summarizeDocument(input: { documentId: string; userId: string; role: string }): Promise<AiDocumentSummaryResponse>;
  explainTransaction(input: { transactionId: string; userId: string; role: UserRole }): Promise<AiTransactionExplanationResponse>;
} = {
  status: getAiRuntimeConfig().isReady ? "ready" : "fallback",

  async summarizePortfolio({ userId }) {
    const summaryPayload = await portfolioService.getSummary(userId);
    const portfolioCacheKey = `portfolio-summary:${userId}:${AI_PROMPT_VERSIONS.portfolioSummary}`;
    const cached = await aiRepository.findLatestValidByCacheKey(portfolioCacheKey);
    if (cached?.response) {
      const cachedResult = mapCachedSummaryResponse(cached, cached.response);
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
      promptInput: summaryPayload as Prisma.InputJsonValue,
    });

    const generated = await createSummary({
      instructions: getPortfolioSummaryInstructions(),
      content: buildPortfolioSummaryPrompt(summaryPayload),
      fallback: buildPortfolioSummaryFallback(summaryPayload),
      context: `portfolio user ${userId}`,
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
    const generated = await createSummary({
      instructions: getDocumentSummaryInstructions(),
      content: buildDocumentSummaryPrompt(document),
      fallback: JSON.stringify(fallback),
      context: `document ${documentId}`,
    });

    let normalized = fallback;
    if (generated.provider === "openai") {
      try {
        normalized = normalizeDocumentSummary(parseJsonObject(generated.summary), fallback);
      } catch {
        normalized = fallback;
      }
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { aiSummaryCache: normalized.summary },
    });

    await aiRepository.completeRequest(request.id, {
      provider: generated.provider,
      model: generated.model,
      cacheValidUntil: getCacheValidUntil({ requestType: "DOCUMENT_SUMMARY" }),
      errorMessage: generated.errorMessage,
      rawResponse: generated.rawResponse as Prisma.InputJsonValue | undefined,
      formattedResponse: normalized satisfies Prisma.JsonObject,
      renderedText: normalized.summary,
    });

    return {
      ...normalized,
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

    const generated = await createSummary({
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
      }),
      fallback: JSON.stringify(fallback),
      context: `transaction ${transactionId}`,
    });

    let normalized = fallback;
    if (generated.provider === "openai") {
      try {
        normalized = normalizeTransactionExplanation(parseJsonObject(generated.summary), fallback);
      } catch {
        normalized = fallback;
      }
    }

    const explanationText = `${normalized.headline}\n\n${normalized.explanation}`;
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
      formattedResponse: normalized satisfies Prisma.JsonObject,
      renderedText: explanationText,
    });

    return {
      ...normalized,
      provider: generated.provider,
      model: generated.model,
      cachedAt: generated.cachedAt,
      source: generated.source,
    };
  },
};
