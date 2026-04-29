import express from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { requireAuth, requireKycApproved } from "../../middleware/auth.js";
import { requireRole } from "../../shared/auth/requireRole.js";
import { asyncHandler } from "../../shared/http/asyncHandler.js";
import { ApiError } from "../../shared/http/apiError.js";
import {
  buildPaginationMeta,
  sendCreated,
  sendPaginated,
  sendSuccess,
} from "../../shared/http/responses.js";
import { getPagination, paginationSchema } from "../../shared/http/pagination.js";
import { userService } from "../../services/operational/user.service.js";
import { propertyService } from "../../services/operational/property.service.js";
import { portfolioService } from "../../services/operational/portfolio.service.js";
import { orderService } from "../../services/operational/order.service.js";
import { transactionService } from "../../services/operational/transaction.service.js";
import { documentService } from "../../services/operational/document.service.js";
import { notificationService } from "../../services/operational/notification.service.js";
import { auditService } from "../../services/operational/audit.service.js";
import { aiService } from "../../services/ai/index.js";
import { blockchainService } from "../../services/blockchain/index.js";

const router = express.Router();

const propertyListSchema = paginationSchema.extend({
  status: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  verificationStatus: z.string().optional(),
  sortBy: z.enum(["createdAt", "address1", "liquidityScore", "lastTradeAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const ordersListSchema = paginationSchema.extend({
  side: z.enum(["BUY", "SELL"]).default("BUY"),
  status: z.string().optional(),
  propertyId: z.string().uuid().optional(),
});

const sellPriceRecommendationSchema = z.object({
  propertyId: z.string().uuid(),
  strategy: z.enum(["MAX_PRICE", "BALANCED", "FAST_EXIT"]).optional(),
});

const transactionsListSchema = paginationSchema.extend({
  propertyId: z.string().uuid().optional(),
});

const documentsListSchema = paginationSchema.extend({
  propertyId: z.string().uuid().optional(),
  tradeId: z.string().uuid().optional(),
  buyOrderId: z.string().uuid().optional(),
  sellOrderId: z.string().uuid().optional(),
  userId: z.string().optional(),
  adminNoteKey: z.string().optional(),
  entityType: z.string().optional(),
  status: z.string().optional(),
  kind: z.string().optional(),
});

const notificationsListSchema = paginationSchema.extend({
  unreadOnly: z.coerce.boolean().default(false),
});

const auditListSchema = paginationSchema.extend({
  action: z.string().optional(),
  actorType: z.string().optional(),
  entityType: z.string().optional(),
});

const createOrderSchema = z.discriminatedUnion("side", [
  z.object({
    side: z.literal("BUY"),
    propertyId: z.string().uuid(),
    sharesRequested: z.number().int().positive(),
    orderType: z.enum(["MARKET", "LIMIT"]),
    maxPricePerShare: z.number().positive().optional().nullable(),
  }),
  z.object({
    side: z.literal("SELL"),
    propertyId: z.string().uuid(),
    sharesForSale: z.number().int().positive(),
    askPricePerShare: z.number().positive(),
    strategy: z.enum(["MAX_PRICE", "BALANCED", "FAST_EXIT"]).optional(),
  }),
]);

const cancelOrderParamsSchema = z.object({
  side: z.enum(["BUY", "SELL"]),
  orderId: z.string().uuid(),
});

const createDocumentSchema = z.object({
  propertyId: z.string().uuid().optional(),
  tradeId: z.string().uuid().optional(),
  buyOrderId: z.string().uuid().optional(),
  sellOrderId: z.string().uuid().optional(),
  entityType: z.enum(["PROPERTY", "TRANSACTION", "ORDER", "USER"]),
  kind: z
    .enum([
      "DEED",
      "APPRAISAL",
      "INSPECTION",
      "OFFERING_MEMO",
      "KYC",
      "TRADE_CONFIRMATION",
      "SUBSCRIPTION_AGREEMENT",
      "OTHER",
    ])
    .default("OTHER"),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  mimeType: z.string().optional(),
  fileSizeBytes: z.number().int().positive().optional(),
  metadata: z.record(z.any()).optional(),
});

const uploadStubDocumentSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().optional().nullable(),
  fileSizeBytes: z.number().int().positive().optional().nullable(),
  kind: z
    .enum([
      "DEED",
      "APPRAISAL",
      "INSPECTION",
      "OFFERING_MEMO",
      "KYC",
      "TRADE_CONFIRMATION",
      "SUBSCRIPTION_AGREEMENT",
      "OTHER",
    ])
    .default("OTHER"),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  verificationStatus: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"]).default("PENDING"),
  propertyId: z.string().uuid().optional(),
  tradeId: z.string().uuid().optional(),
  buyOrderId: z.string().uuid().optional(),
  sellOrderId: z.string().uuid().optional(),
  notes: z.string().optional().nullable(),
  linkTarget: z.object({
    type: z.enum(["PROPERTY", "TRANSACTION", "USER", "ADMIN_NOTE"]),
    id: z.string().min(1),
  }),
});

const summarizeDocumentParamsSchema = z.object({
  documentId: z.string().uuid(),
});

const explainTransactionSchema = z.object({
  transactionId: z.string().uuid(),
});

const ownershipSummarySchema = z.object({
  propertyId: z.string().uuid(),
});

const auditSummarySchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  action: z.string().optional(),
  actorType: z.string().optional(),
  entityType: z.string().optional(),
});

const anomalyDetectionSchema = z.object({
  propertyId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const liquidityInsightSchema = z.object({
  propertyId: z.string().uuid(),
});

const blockchainPropertyParamsSchema = z.object({
  propertyId: z.string().uuid(),
});

const blockchainTransactionParamsSchema = z.object({
  transactionId: z.string().uuid(),
});

const blockchainProofSchema = z.object({
  txHash: z.string().min(10).optional().nullable(),
  walletAddress: z.string().min(6).optional().nullable(),
  contractAddress: z.string().min(6).optional().nullable(),
  blockNumber: z.number().int().positive().optional().nullable(),
  proofPayload: z.record(z.any()).optional().nullable(),
});

const blockchainOwnershipProofSchema = blockchainProofSchema.extend({
  ownerUserId: z.string().uuid().optional().nullable(),
});

const blockchainSyncSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
});

router.get(
  "/users/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await userService.getProfile(req.user!.id);
    return sendSuccess(res, profile);
  })
);

router.get(
  "/users/:userId/holdings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (req.user!.id !== userId && req.user!.role !== UserRole.ADMIN) {
      throw new ApiError(403, "FORBIDDEN", "Not allowed to view these holdings");
    }

    const parsed = paginationSchema.parse(req.query);
    const pagination = getPagination(parsed);
    const result = await userService.listHoldings(userId, pagination);

    return sendPaginated<any>(
      res,
      result.items,
      buildPaginationMeta({
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: result.total,
      })
    );
  })
);

router.get(
  "/properties",
  asyncHandler(async (req, res) => {
    const parsed = propertyListSchema.parse(req.query);
    const pagination = getPagination(parsed);
    const result = await propertyService.list(parsed, pagination);
    return sendPaginated<any>(res, result.items, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / pagination.pageSize)),
    });
  })
);

router.get(
  "/properties/:propertyId",
  asyncHandler(async (req, res) => {
    const detail = await propertyService.detail(req.params.propertyId);
    return sendSuccess(res, detail);
  })
);

router.get(
  "/blockchain/properties/:propertyId/verification",
  asyncHandler(async (req, res) => {
    const { propertyId } = blockchainPropertyParamsSchema.parse(req.params);
    const verification = await blockchainService.getPropertyVerification(propertyId);
    return sendSuccess(res, verification, { blockchainStatus: blockchainService.status });
  })
);

router.post(
  "/blockchain/properties/:propertyId/ownership-proof",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const { propertyId } = blockchainPropertyParamsSchema.parse(req.params);
    const payload = blockchainOwnershipProofSchema.parse(req.body);
    const verification = await blockchainService.recordOwnershipProof({
      propertyId,
      ownerUserId: payload.ownerUserId,
      txHash: payload.txHash,
      walletAddress: payload.walletAddress,
      contractAddress: payload.contractAddress,
      blockNumber: payload.blockNumber,
      proofPayload: payload.proofPayload ?? undefined,
    });
    return sendSuccess(res, verification, { blockchainStatus: blockchainService.status });
  })
);

router.get(
  "/portfolio/summary",
  requireAuth,
  asyncHandler(async (req, res) => {
    const summary = await portfolioService.getSummary(req.user!.id);
    return sendSuccess(res, summary);
  })
);

router.post(
  "/portfolio/summary/ai",
  requireAuth,
  asyncHandler(async (req, res) => {
    const summary = await aiService.summarizePortfolio({ userId: req.user!.id });
    return sendSuccess(res, summary, { aiStatus: aiService.status });
  })
);

router.get(
  "/orders",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = ordersListSchema.parse(req.query);
    const pagination = getPagination(parsed);
    const result = await orderService.listOrders(
      {
        userId: req.user!.id,
        role: req.user!.role,
        side: parsed.side,
        status: parsed.status,
        propertyId: parsed.propertyId,
      },
      pagination
    );

    return sendPaginated<any>(
      res,
      result.items,
      buildPaginationMeta({
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: result.total,
      }),
      { orderSide: result.type }
    );
  })
);

router.get(
  "/orders/sell-recommendation",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = sellPriceRecommendationSchema.parse(req.query);
    const recommendation = await orderService.getSellPriceRecommendation(parsed);
    return sendSuccess(res, recommendation, { aiStatus: aiService.status });
  })
);

router.get(
  "/blockchain/transactions/:transactionId/verification",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { transactionId } = blockchainTransactionParamsSchema.parse(req.params);
    const verification = await blockchainService.getTransactionVerification(
      { userId: req.user!.id, role: req.user!.role },
      transactionId
    );
    return sendSuccess(res, verification, { blockchainStatus: blockchainService.status });
  })
);

router.post(
  "/blockchain/transactions/:transactionId/transfer-proof",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const { transactionId } = blockchainTransactionParamsSchema.parse(req.params);
    const payload = blockchainProofSchema.parse(req.body);
    const verification = await blockchainService.recordTransferProof({
      transactionId,
      txHash: payload.txHash,
      walletAddress: payload.walletAddress,
      contractAddress: payload.contractAddress,
      blockNumber: payload.blockNumber,
      proofPayload: payload.proofPayload ?? undefined,
    });
    return sendSuccess(res, verification, { blockchainStatus: blockchainService.status });
  })
);

router.post(
  "/blockchain/sync",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const payload = blockchainSyncSchema.parse(req.body ?? {});
    const result = await blockchainService.syncPendingRecords(payload.limit);
    return sendSuccess(res, result, { blockchainStatus: blockchainService.status });
  })
);

router.post(
  "/orders",
  requireAuth,
  requireKycApproved,
  asyncHandler(async (req, res) => {
    const parsed = createOrderSchema.parse(req.body);
    const order = await orderService.createOrder(req.user!, parsed as any);
    return sendCreated(res, order);
  })
);

router.post(
  "/documents/:documentId/summarize",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { documentId } = summarizeDocumentParamsSchema.parse(req.params);
    const summary = await aiService.summarizeDocument({
      documentId,
      userId: req.user!.id,
      role: req.user!.role,
    });
    return sendSuccess(res, summary, { aiStatus: aiService.status });
  })
);

router.post(
  "/ai/explain-transaction",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { transactionId } = explainTransactionSchema.parse(req.body);
    const explanation = await aiService.explainTransaction({
      transactionId,
      userId: req.user!.id,
      role: req.user!.role,
    });
    return sendSuccess(res, explanation, { aiStatus: aiService.status });
  })
);

router.post(
  "/ai/ownership-summary",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { propertyId } = ownershipSummarySchema.parse(req.body);
    const summary = await aiService.summarizeOwnership({ propertyId });
    return sendSuccess(res, summary, { aiStatus: aiService.status });
  })
);

router.post(
  "/ai/audit-summary",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const payload = auditSummarySchema.parse(req.body ?? {});
    const summary = await aiService.summarizeAudit(payload);
    return sendSuccess(res, summary, { aiStatus: aiService.status });
  })
);

router.post(
  "/ai/anomaly-detection",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const payload = anomalyDetectionSchema.parse(req.body ?? {});
    const result = await aiService.detectAnomalies(payload);
    return sendSuccess(res, result, { aiStatus: aiService.status });
  })
);

router.post(
  "/ai/liquidity-insight",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { propertyId } = liquidityInsightSchema.parse(req.body);
    const insight = await aiService.explainLiquidity({ propertyId });
    return sendSuccess(res, insight, { aiStatus: aiService.status });
  })
);

router.post(
  "/orders/:side/:orderId/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = cancelOrderParamsSchema.parse(req.params);
    const order = await orderService.cancelOrder(req.user!, parsed.side, parsed.orderId);
    return sendSuccess(res, order);
  })
);

router.get(
  "/transactions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = transactionsListSchema.parse(req.query);
    const pagination = getPagination(parsed);
    const result = await transactionService.list(
      {
        userId: req.user!.id,
        role: req.user!.role,
        propertyId: parsed.propertyId,
      },
      pagination
    );
    return sendPaginated(
      res,
      result.items,
      buildPaginationMeta({
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: result.total,
      })
    );
  })
);

router.get(
  "/documents",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = documentsListSchema.parse(req.query);
    const pagination = getPagination(parsed);
    const result = await documentService.list(parsed, pagination);
    return sendPaginated(
      res,
      result.items,
      buildPaginationMeta({
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: result.total,
      })
    );
  })
);

router.get(
  "/documents/by-entity",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = documentsListSchema.parse(req.query);
    const pagination = getPagination(parsed);
    const result = await documentService.list(parsed, pagination);
    return sendPaginated(
      res,
      result.items,
      buildPaginationMeta({
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: result.total,
      })
    );
  })
);

router.post(
  "/documents/metadata",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = createDocumentSchema.parse(req.body);
    const document = await documentService.createMetadata(req.user!.id, parsed as any);
    return sendCreated(res, document);
  })
);

router.post(
  "/documents/upload-stub",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = uploadStubDocumentSchema.parse(req.body);
    const document = await documentService.uploadStub(req.user!, parsed);
    return sendCreated(res, document);
  })
);

router.get(
  "/notifications",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = notificationsListSchema.parse(req.query);
    const pagination = getPagination(parsed);
    const result = await notificationService.list(req.user!.id, parsed.unreadOnly, pagination);
    return sendPaginated(
      res,
      result.items,
      buildPaginationMeta({
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: result.total,
      })
    );
  })
);

router.post(
  "/notifications/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await notificationService.markRead(req.user!.id, req.params.id);
    return sendSuccess(res, result);
  })
);

router.post(
  "/notifications/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await notificationService.markAllRead(req.user!.id);
    return sendSuccess(res, result);
  })
);

router.get(
  "/admin/audit-history",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  asyncHandler(async (req, res) => {
    const parsed = auditListSchema.parse(req.query);
    const pagination = getPagination(parsed);
    const result = await auditService.list(parsed, pagination);
    return sendPaginated(
      res,
      result.items,
      buildPaginationMeta({
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: result.total,
      })
    );
  })
);

export default router;
