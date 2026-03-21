import {
  AuditAction,
  AuditActorType,
  BuyOrderStatus,
  BuyOrderType,
  NotificationType,
  Prisma,
  SellOrderStatus,
  SellOrderStrategy,
  UserRole,
  VerificationStatus,
} from "@prisma/client";
import { orderRepository } from "../../repositories/order.repository.js";
import { ApiError } from "../../shared/http/apiError.js";
import { buildExtensionFields } from "../../shared/http/extensions.js";

type AuthUser = { id: string; role: UserRole };

type BuyPayload = {
  side: "BUY";
  propertyId: string;
  sharesRequested: number;
  orderType: BuyOrderType;
  maxPricePerShare?: number | null;
};

type SellPayload = {
  side: "SELL";
  propertyId: string;
  sharesForSale: number;
  askPricePerShare: number;
  strategy?: SellOrderStrategy;
};

function toDecimal(value: number | string | Prisma.Decimal | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return new Prisma.Decimal(value);
}

function getExecutionSummary(input: {
  status: BuyOrderStatus | SellOrderStatus;
  executedShares: number;
  transactionId?: string;
  executionMode: "OPEN_ORDER" | "MATCHED_ORDER" | "PRIMARY_ISSUANCE";
}) {
  const status = String(input.status);

  return {
    workflowStatus: status === "CANCELLED" ? "cancelled" : status === "FILLED" ? "completed" : "pending",
    executedShares: input.executedShares,
    transactionCreated: Boolean(input.transactionId),
    transactionId: input.transactionId ?? null,
    executionMode: input.executionMode,
  };
}

async function createExecutionArtifacts(input: {
  tx: Prisma.TransactionClient;
  actorUserId: string;
  propertyId: string;
  propertyAddress: string;
  buyOrderId?: string;
  sellOrderId: string;
  tradeId: string;
  buyerUserId: string;
  sellerUserId: string;
  sharesTraded: number;
  pricePerShare: Prisma.Decimal;
  executionMode: "MATCHED_ORDER" | "PRIMARY_ISSUANCE";
}) {
  const totalAmount = Number(input.pricePerShare) * input.sharesTraded;
  const priceLabel = `$${Number(input.pricePerShare).toFixed(2)}`;
  const totalLabel = `$${totalAmount.toFixed(2)}`;

  await Promise.all([
    orderRepository.createNotification(
      {
        userId: input.buyerUserId,
        propertyId: input.propertyId,
        type: NotificationType.TRADE,
        message: `Buy order executed for ${input.propertyAddress}: ${input.sharesTraded} shares at ${priceLabel} (${totalLabel}).`,
      },
      input.tx
    ),
    orderRepository.createNotification(
      {
        userId: input.sellerUserId,
        propertyId: input.propertyId,
        type: NotificationType.TRADE,
        message: `Sell order executed for ${input.propertyAddress}: ${input.sharesTraded} shares at ${priceLabel} (${totalLabel}).`,
      },
      input.tx
    ),
    orderRepository.createAuditLog(
      {
        actorUserId: input.actorUserId,
        actorType: AuditActorType.USER,
        action: AuditAction.CREATE,
        entityType: "TRADE",
        entityId: input.tradeId,
        targetUserId: input.buyerUserId,
        propertyId: input.propertyId,
        tradeId: input.tradeId,
        metadata: {
          executionMode: input.executionMode,
          buyOrderId: input.buyOrderId ?? null,
          sellOrderId: input.sellOrderId,
          sharesTraded: input.sharesTraded,
          pricePerShare: Number(input.pricePerShare),
          totalAmount,
        },
      },
      input.tx
    ),
    orderRepository.createTradeConfirmationDocument(
      {
        uploadedByUserId: input.actorUserId,
        propertyId: input.propertyId,
        tradeId: input.tradeId,
        buyOrderId: input.buyOrderId,
        sellOrderId: input.sellOrderId,
        fileName: `${input.propertyAddress} trade confirmation.pdf`,
        fileUrl: `https://demo.brickly.local/trades/${input.tradeId}/confirmation`,
        metadata: {
          generatedInternally: true,
          executionMode: input.executionMode,
          note: "PHASE_3_BLOCKCHAIN: replace this internal confirmation with verified transfer evidence when ownership settlement moves on-chain.",
        },
      },
      input.tx
    ),
  ]);
}

async function executeBuyWorkflow(
  tx: Prisma.TransactionClient,
  user: AuthUser,
  payload: BuyPayload
) {
  const property = await orderRepository.findPropertyExecutionContext(payload.propertyId, tx);
  if (!property?.shareClass) {
    throw new ApiError(404, "NOT_FOUND", "Property share class not found");
  }

  const maxPricePerShare =
    payload.orderType === BuyOrderType.LIMIT
      ? toDecimal(payload.maxPricePerShare ?? null)
      : null;

  const buyOrder = await orderRepository.createBuyOrder(
    {
      buyerUserId: user.id,
      propertyId: payload.propertyId,
      sharesRequested: payload.sharesRequested,
      orderType: payload.orderType,
      maxPricePerShare,
      status: BuyOrderStatus.OPEN,
      verificationStatus: VerificationStatus.PENDING,
    },
    tx
  );

  await orderRepository.createNotification(
    {
      userId: user.id,
      propertyId: payload.propertyId,
      type: NotificationType.SYSTEM,
      message: `Buy order created for ${property.address1}: ${payload.sharesRequested} shares requested.`,
    },
    tx
  );

  let executedShares = 0;
  let tradeId: string | undefined;
  let executionMode: "OPEN_ORDER" | "MATCHED_ORDER" | "PRIMARY_ISSUANCE" = "OPEN_ORDER";
  let finalStatus: BuyOrderStatus = BuyOrderStatus.OPEN;

  const matchingSellOrder = await orderRepository.findMatchingSellOrder(
    {
      propertyId: payload.propertyId,
      buyerUserId: user.id,
      maxPricePerShare,
    },
    tx
  );

  if (matchingSellOrder) {
    const sharesTraded = Math.min(payload.sharesRequested, matchingSellOrder.remainingShares);
    const pricePerShare = matchingSellOrder.askPricePerShare;
    const remainingBuyShares = payload.sharesRequested - sharesTraded;
    const remainingSellShares = matchingSellOrder.remainingShares - sharesTraded;
    const tradedAt = new Date();

    executedShares = sharesTraded;
    executionMode = "MATCHED_ORDER";
    finalStatus = remainingBuyShares === 0 ? BuyOrderStatus.FILLED : BuyOrderStatus.PARTIAL;

    await orderRepository.decrementHoldingShares(
      matchingSellOrder.userId,
      property.shareClass.id,
      sharesTraded,
      tx
    );
    await orderRepository.deleteEmptyHoldingIfNeeded(
      matchingSellOrder.userId,
      property.shareClass.id,
      tx
    );
    await orderRepository.upsertHoldingShares(user.id, property.shareClass.id, sharesTraded, tx);

    const trade = await orderRepository.createTrade(
      {
        sellOrderId: matchingSellOrder.id,
        propertyId: payload.propertyId,
        buyerUserId: user.id,
        sellerUserId: matchingSellOrder.userId,
        sharesTraded,
        pricePerShare,
        verificationStatus: VerificationStatus.PENDING,
        tradedAt,
      },
      tx
    );
    tradeId = trade.id;

    await Promise.all([
      orderRepository.updateBuyOrder(
        buyOrder.id,
        {
          filledShares: sharesTraded,
          status: finalStatus,
        },
        tx
      ),
      orderRepository.updateSellOrder(
        matchingSellOrder.id,
        {
          remainingShares: remainingSellShares,
          status:
            remainingSellShares === 0 ? SellOrderStatus.FILLED : SellOrderStatus.PARTIAL,
        },
        tx
      ),
      orderRepository.updatePropertyTradeTimestamp(payload.propertyId, tradedAt, tx),
      orderRepository.createAuditLog(
        {
          actorUserId: user.id,
          actorType: AuditActorType.USER,
          action: AuditAction.CREATE,
          entityType: "BUY_ORDER",
          entityId: buyOrder.id,
          targetUserId: user.id,
          propertyId: payload.propertyId,
          tradeId: trade.id,
          metadata: {
            workflowStatus: finalStatus,
            executionMode,
            requestedShares: payload.sharesRequested,
            executedShares,
            matchedSellOrderId: matchingSellOrder.id,
          },
        },
        tx
      ),
    ]);

    await createExecutionArtifacts({
      tx,
      actorUserId: user.id,
      propertyId: payload.propertyId,
      propertyAddress: property.address1,
      buyOrderId: buyOrder.id,
      sellOrderId: matchingSellOrder.id,
      tradeId: trade.id,
      buyerUserId: user.id,
      sellerUserId: matchingSellOrder.userId,
      sharesTraded,
      pricePerShare,
      executionMode,
    });
  } else if (property.shareClass.sharesAvailable > 0) {
    const sharesTraded = Math.min(payload.sharesRequested, property.shareClass.sharesAvailable);
    const remainingBuyShares = payload.sharesRequested - sharesTraded;
    const pricePerShare =
      maxPricePerShare ?? property.shareClass.referencePricePerShare;
    const sponsorUserId =
      property.listings[0]?.listerUserId ??
      (await orderRepository.findFallbackCounterpartyUser(user.id, tx))?.id;

    if (!sponsorUserId) {
      throw new ApiError(
        500,
        "WORKFLOW_CONFIGURATION_ERROR",
        "No internal sponsor account available for primary issuance"
      );
    }

    const internalSellOrder = await orderRepository.createSellOrder(
      {
        userId: sponsorUserId,
        propertyId: payload.propertyId,
        sharesForSale: sharesTraded,
        remainingShares: 0,
        askPricePerShare: pricePerShare,
        strategy: SellOrderStrategy.BALANCED,
        status: SellOrderStatus.FILLED,
        verificationStatus: VerificationStatus.PENDING,
        aiSummaryCache:
          "Internal primary issuance placeholder. PHASE_3_BLOCKCHAIN: replace internal sponsor execution with verified issuance and settlement references.",
      },
      tx
    );

    const tradedAt = new Date();
    const trade = await orderRepository.createTrade(
      {
        sellOrderId: internalSellOrder.id,
        propertyId: payload.propertyId,
        buyerUserId: user.id,
        sellerUserId: sponsorUserId,
        sharesTraded,
        pricePerShare,
        verificationStatus: VerificationStatus.PENDING,
        aiSummaryCache:
          "Internal primary issuance settlement. PHASE_3_BLOCKCHAIN: replace with verified on-chain transfer evidence.",
        tradedAt,
      },
      tx
    );

    executedShares = sharesTraded;
    tradeId = trade.id;
    executionMode = "PRIMARY_ISSUANCE";
    finalStatus = remainingBuyShares === 0 ? BuyOrderStatus.FILLED : BuyOrderStatus.PARTIAL;

    await Promise.all([
      orderRepository.adjustShareInventory(property.shareClass.id, -sharesTraded, tx),
      orderRepository.upsertHoldingShares(user.id, property.shareClass.id, sharesTraded, tx),
      orderRepository.updateBuyOrder(
        buyOrder.id,
        {
          filledShares: sharesTraded,
          status: finalStatus,
        },
        tx
      ),
      orderRepository.updatePropertyTradeTimestamp(payload.propertyId, tradedAt, tx),
      orderRepository.createAuditLog(
        {
          actorUserId: user.id,
          actorType: AuditActorType.USER,
          action: AuditAction.CREATE,
          entityType: "BUY_ORDER",
          entityId: buyOrder.id,
          targetUserId: user.id,
          propertyId: payload.propertyId,
          tradeId: trade.id,
          metadata: {
            workflowStatus: finalStatus,
            executionMode,
            requestedShares: payload.sharesRequested,
            executedShares,
            shareInventoryConsumed: sharesTraded,
          },
        },
        tx
      ),
    ]);

    await createExecutionArtifacts({
      tx,
      actorUserId: user.id,
      propertyId: payload.propertyId,
      propertyAddress: property.address1,
      buyOrderId: buyOrder.id,
      sellOrderId: internalSellOrder.id,
      tradeId: trade.id,
      buyerUserId: user.id,
      sellerUserId: sponsorUserId,
      sharesTraded,
      pricePerShare,
      executionMode,
    });
  } else {
    await Promise.all([
      orderRepository.createNotification(
        {
          userId: user.id,
          propertyId: payload.propertyId,
          type: NotificationType.SYSTEM,
          message: `Buy order submitted for ${property.address1}. The order is pending until inventory or a matching seller becomes available.`,
        },
        tx
      ),
      orderRepository.createAuditLog(
        {
          actorUserId: user.id,
          actorType: AuditActorType.USER,
          action: AuditAction.CREATE,
          entityType: "BUY_ORDER",
          entityId: buyOrder.id,
          targetUserId: user.id,
          propertyId: payload.propertyId,
          metadata: {
            workflowStatus: "pending",
            executionMode: "OPEN_ORDER",
            requestedShares: payload.sharesRequested,
          },
        },
        tx
      ),
    ]);
  }

  const finalOrder = await orderRepository.findBuyOrderById(buyOrder.id, tx);
  if (!finalOrder) {
    throw new ApiError(500, "ORDER_STATE_ERROR", "Order could not be reloaded");
  }

  return {
    id: finalOrder.id,
    side: "BUY",
    status: finalOrder.status,
    propertyId: finalOrder.propertyId,
    sharesRequested: finalOrder.sharesRequested,
    filledShares: finalOrder.filledShares,
    maxPricePerShare: finalOrder.maxPricePerShare ? Number(finalOrder.maxPricePerShare) : null,
    createdAt: finalOrder.createdAt,
    property: {
      id: finalOrder.property.id,
      name: finalOrder.property.address1,
      city: finalOrder.property.city,
      state: finalOrder.property.state,
    },
    workflow: getExecutionSummary({
      status: finalOrder.status,
      executedShares,
      transactionId: tradeId,
      executionMode,
    }),
    ...buildExtensionFields({
      verificationStatus: finalOrder.verificationStatus,
      blockchainTxHash: finalOrder.blockchainTxHash,
      aiSummaryCache: finalOrder.aiSummaryCache,
    }),
  };
}

async function executeSellWorkflow(
  tx: Prisma.TransactionClient,
  user: AuthUser,
  payload: SellPayload
) {
  const property = await orderRepository.findPropertyExecutionContext(payload.propertyId, tx);
  if (!property?.shareClass) {
    throw new ApiError(404, "NOT_FOUND", "Property share class not found");
  }

  const holding = await orderRepository.findHolding(user.id, property.shareClass.id, tx);
  if (!holding || holding.sharesOwned < payload.sharesForSale) {
    throw new ApiError(400, "INSUFFICIENT_SHARES", "Not enough shares owned");
  }

  const askPricePerShare = new Prisma.Decimal(payload.askPricePerShare);
  const sellOrder = await orderRepository.createSellOrder(
    {
      userId: user.id,
      propertyId: payload.propertyId,
      sharesForSale: payload.sharesForSale,
      remainingShares: payload.sharesForSale,
      askPricePerShare,
      strategy: payload.strategy ?? SellOrderStrategy.BALANCED,
      status: SellOrderStatus.OPEN,
      verificationStatus: VerificationStatus.PENDING,
    },
    tx
  );

  await orderRepository.createNotification(
    {
      userId: user.id,
      propertyId: payload.propertyId,
      sellOrderId: sellOrder.id,
      type: NotificationType.SYSTEM,
      message: `Sell order created for ${property.address1}: ${payload.sharesForSale} shares listed at $${payload.askPricePerShare.toFixed(2)}.`,
    },
    tx
  );

  let executedShares = 0;
  let tradeId: string | undefined;
  let executionMode: "OPEN_ORDER" | "MATCHED_ORDER" | "PRIMARY_ISSUANCE" = "OPEN_ORDER";
  let finalStatus: SellOrderStatus = SellOrderStatus.OPEN;

  const matchingBuyOrder = await orderRepository.findMatchingBuyOrder(
    {
      propertyId: payload.propertyId,
      sellerUserId: user.id,
      askPricePerShare,
    },
    tx
  );

  if (matchingBuyOrder) {
    const sharesTraded = Math.min(payload.sharesForSale, matchingBuyOrder.sharesRequested - matchingBuyOrder.filledShares);
    const remainingSellShares = payload.sharesForSale - sharesTraded;
    const newFilledShares = matchingBuyOrder.filledShares + sharesTraded;
    const tradedAt = new Date();

    executedShares = sharesTraded;
    tradeId = undefined;
    executionMode = "MATCHED_ORDER";
    finalStatus = remainingSellShares === 0 ? SellOrderStatus.FILLED : SellOrderStatus.PARTIAL;

    await orderRepository.decrementHoldingShares(user.id, property.shareClass.id, sharesTraded, tx);
    await orderRepository.deleteEmptyHoldingIfNeeded(user.id, property.shareClass.id, tx);
    await orderRepository.upsertHoldingShares(matchingBuyOrder.buyerUserId, property.shareClass.id, sharesTraded, tx);

    const trade = await orderRepository.createTrade(
      {
        sellOrderId: sellOrder.id,
        propertyId: payload.propertyId,
        buyerUserId: matchingBuyOrder.buyerUserId,
        sellerUserId: user.id,
        sharesTraded,
        pricePerShare: askPricePerShare,
        verificationStatus: VerificationStatus.PENDING,
        tradedAt,
      },
      tx
    );
    tradeId = trade.id;

    await Promise.all([
      orderRepository.updateSellOrder(
        sellOrder.id,
        {
          remainingShares: remainingSellShares,
          status: finalStatus,
        },
        tx
      ),
      orderRepository.updateBuyOrder(
        matchingBuyOrder.id,
        {
          filledShares: newFilledShares,
          status:
            newFilledShares >= matchingBuyOrder.sharesRequested
              ? BuyOrderStatus.FILLED
              : BuyOrderStatus.PARTIAL,
        },
        tx
      ),
      orderRepository.updatePropertyTradeTimestamp(payload.propertyId, tradedAt, tx),
      orderRepository.createAuditLog(
        {
          actorUserId: user.id,
          actorType: AuditActorType.USER,
          action: AuditAction.CREATE,
          entityType: "SELL_ORDER",
          entityId: sellOrder.id,
          targetUserId: user.id,
          propertyId: payload.propertyId,
          tradeId: trade.id,
          metadata: {
            workflowStatus: finalStatus,
            executionMode,
            sharesForSale: payload.sharesForSale,
            executedShares,
            matchedBuyOrderId: matchingBuyOrder.id,
          },
        },
        tx
      ),
    ]);

    await createExecutionArtifacts({
      tx,
      actorUserId: user.id,
      propertyId: payload.propertyId,
      propertyAddress: property.address1,
      buyOrderId: matchingBuyOrder.id,
      sellOrderId: sellOrder.id,
      tradeId: trade.id,
      buyerUserId: matchingBuyOrder.buyerUserId,
      sellerUserId: user.id,
      sharesTraded,
      pricePerShare: askPricePerShare,
      executionMode,
    });
  } else {
    await Promise.all([
      orderRepository.createNotification(
        {
          userId: user.id,
          propertyId: payload.propertyId,
          sellOrderId: sellOrder.id,
          type: NotificationType.SYSTEM,
          message: `Sell order submitted for ${property.address1}. The order is pending until a matching buyer is available.`,
        },
        tx
      ),
      orderRepository.createAuditLog(
        {
          actorUserId: user.id,
          actorType: AuditActorType.USER,
          action: AuditAction.CREATE,
          entityType: "SELL_ORDER",
          entityId: sellOrder.id,
          targetUserId: user.id,
          propertyId: payload.propertyId,
          metadata: {
            workflowStatus: "pending",
            executionMode: "OPEN_ORDER",
            sharesForSale: payload.sharesForSale,
            askPricePerShare: payload.askPricePerShare,
          },
        },
        tx
      ),
    ]);
  }

  const finalOrder = await orderRepository.findSellOrderById(sellOrder.id, tx);
  if (!finalOrder) {
    throw new ApiError(500, "ORDER_STATE_ERROR", "Order could not be reloaded");
  }

  return {
    id: finalOrder.id,
    side: "SELL",
    status: finalOrder.status,
    propertyId: finalOrder.propertyId,
    sharesForSale: finalOrder.sharesForSale,
    remainingShares: finalOrder.remainingShares,
    askPricePerShare: Number(finalOrder.askPricePerShare),
    createdAt: finalOrder.createdAt,
    property: {
      id: finalOrder.property.id,
      name: finalOrder.property.address1,
      city: finalOrder.property.city,
      state: finalOrder.property.state,
    },
    workflow: getExecutionSummary({
      status: finalOrder.status,
      executedShares,
      transactionId: tradeId,
      executionMode,
    }),
    ...buildExtensionFields({
      verificationStatus: finalOrder.verificationStatus,
      blockchainTxHash: finalOrder.blockchainTxHash,
      aiSummaryCache: finalOrder.aiSummaryCache,
    }),
  };
}

export const orderService = {
  async listOrders(
    input: {
      userId: string;
      role: UserRole;
      side?: "BUY" | "SELL";
      status?: string;
      propertyId?: string;
    },
    pagination: { skip: number; take: number; page: number; pageSize: number }
  ) {
    if (input.side === "SELL") {
      const where = {
        userId: input.role === UserRole.ADMIN ? undefined : input.userId,
        propertyId: input.propertyId,
        status: input.status as SellOrderStatus | undefined,
      };
      const [total, orders] = await Promise.all([
        orderRepository.countSellOrders(where),
        orderRepository.findSellOrders(where, pagination.skip, pagination.take),
      ]);
      return {
        type: "SELL",
        total,
        items: orders.map((order) => ({
          id: order.id,
          side: "SELL",
          status: order.status,
          workflowStatus:
            order.status === SellOrderStatus.FILLED
              ? "completed"
              : order.status === SellOrderStatus.CANCELLED
                ? "cancelled"
                : "pending",
          propertyId: order.propertyId,
          shares: order.sharesForSale,
          sharesForSale: order.sharesForSale,
          remainingShares: order.remainingShares,
          askPricePerShare: Number(order.askPricePerShare),
          optimizedPricePerShare: order.optimizedPricePerShare
            ? Number(order.optimizedPricePerShare)
            : null,
          createdAt: order.createdAt,
          owner: order.user,
          property: {
            id: order.property.id,
            name: order.property.address1,
            address1: order.property.address1,
            city: order.property.city,
            state: order.property.state,
            thumbnailUrl: order.property.images[0]?.url ?? null,
          },
          ...buildExtensionFields({
            verificationStatus: order.verificationStatus,
            blockchainTxHash: order.blockchainTxHash,
            aiSummaryCache: order.aiSummaryCache,
          }),
        })),
      };
    }

    const where = {
      buyerUserId: input.role === UserRole.ADMIN ? undefined : input.userId,
      propertyId: input.propertyId,
      status: input.status as BuyOrderStatus | undefined,
    };

    const [total, orders] = await Promise.all([
      orderRepository.countBuyOrders(where),
      orderRepository.findBuyOrders(where, pagination.skip, pagination.take),
    ]);

    return {
      type: "BUY",
      total,
      items: orders.map((order) => ({
        id: order.id,
        side: "BUY",
        status: order.status,
        workflowStatus:
          order.status === BuyOrderStatus.FILLED
            ? "completed"
            : order.status === BuyOrderStatus.CANCELLED
              ? "cancelled"
              : "pending",
        propertyId: order.propertyId,
        sharesRequested: order.sharesRequested,
        filledShares: order.filledShares,
        maxPricePerShare: order.maxPricePerShare
          ? Number(order.maxPricePerShare)
          : null,
        orderType: order.orderType,
        createdAt: order.createdAt,
        buyer: order.buyer,
        property: {
          id: order.property.id,
          name: order.property.address1,
          address1: order.property.address1,
          city: order.property.city,
          state: order.property.state,
          thumbnailUrl: order.property.images[0]?.url ?? null,
        },
        ...buildExtensionFields({
          verificationStatus: order.verificationStatus,
          blockchainTxHash: order.blockchainTxHash,
          aiSummaryCache: order.aiSummaryCache,
        }),
      })),
    };
  },

  async createOrder(user: AuthUser, payload: BuyPayload | SellPayload) {
    return orderRepository.runInTransaction(async (tx) => {
      if (payload.side === "BUY") {
        if (payload.orderType === BuyOrderType.LIMIT && !payload.maxPricePerShare) {
          throw new ApiError(
            400,
            "INVALID_ORDER",
            "Limit orders require a maximum price per share"
          );
        }

        return executeBuyWorkflow(tx, user, payload);
      }

      return executeSellWorkflow(tx, user, payload);
    });
  },

  async cancelOrder(user: AuthUser, side: "BUY" | "SELL", orderId: string) {
    return orderRepository.runInTransaction(async (tx) => {
      if (side === "BUY") {
        const order = await orderRepository.findBuyOrderById(orderId, tx);
        if (!order) {
          throw new ApiError(404, "NOT_FOUND", "Buy order not found");
        }
        if (user.role !== UserRole.ADMIN && order.buyerUserId !== user.id) {
          throw new ApiError(403, "FORBIDDEN", "Not allowed to cancel this order");
        }
        if (order.status === BuyOrderStatus.FILLED) {
          throw new ApiError(400, "ORDER_ALREADY_COMPLETED", "Completed orders cannot be cancelled");
        }
        if (order.status === BuyOrderStatus.CANCELLED) {
          return {
            id: order.id,
            side,
            status: order.status,
            workflow: getExecutionSummary({
              status: order.status,
              executedShares: order.filledShares,
              executionMode: "OPEN_ORDER",
            }),
          };
        }

        const updated = await orderRepository.updateBuyOrder(
          order.id,
          { status: BuyOrderStatus.CANCELLED },
          tx
        );

        await Promise.all([
          orderRepository.createNotification(
            {
              userId: order.buyerUserId,
              propertyId: order.propertyId,
              type: NotificationType.SYSTEM,
              message: `Buy order for ${order.property.address1} was cancelled.`,
            },
            tx
          ),
          ...(user.role === UserRole.ADMIN
            ? [
                orderRepository.createNotification(
                  {
                    userId: user.id,
                    propertyId: order.propertyId,
                    type: NotificationType.SYSTEM,
                    message: `Admin action recorded: cancelled buy order ${order.id}.`,
                  },
                  tx
                ),
              ]
            : []),
          orderRepository.createAuditLog(
            {
              actorUserId: user.id,
              actorType: user.role === UserRole.ADMIN ? AuditActorType.ADMIN : AuditActorType.USER,
              action: AuditAction.UPDATE,
              entityType: "BUY_ORDER",
              entityId: order.id,
              targetUserId: order.buyerUserId,
              propertyId: order.propertyId,
              metadata: {
                previousStatus: order.status,
                nextStatus: BuyOrderStatus.CANCELLED,
              },
            },
            tx
          ),
        ]);

        return {
          id: updated.id,
          side,
          status: updated.status,
          workflow: getExecutionSummary({
            status: updated.status,
            executedShares: updated.filledShares,
            executionMode: "OPEN_ORDER",
          }),
        };
      }

      const order = await orderRepository.findSellOrderById(orderId, tx);
      if (!order) {
        throw new ApiError(404, "NOT_FOUND", "Sell order not found");
      }
      if (user.role !== UserRole.ADMIN && order.userId !== user.id) {
        throw new ApiError(403, "FORBIDDEN", "Not allowed to cancel this order");
      }
      if (order.status === SellOrderStatus.FILLED) {
        throw new ApiError(400, "ORDER_ALREADY_COMPLETED", "Completed orders cannot be cancelled");
      }
      if (order.status === SellOrderStatus.CANCELLED) {
        return {
          id: order.id,
          side,
          status: order.status,
          workflow: getExecutionSummary({
            status: order.status,
            executedShares: order.sharesForSale - order.remainingShares,
            executionMode: "OPEN_ORDER",
          }),
        };
      }

      const updated = await orderRepository.updateSellOrder(
        order.id,
        { status: SellOrderStatus.CANCELLED },
        tx
      );

      await Promise.all([
        orderRepository.createNotification(
          {
            userId: order.userId,
            propertyId: order.propertyId,
            sellOrderId: order.id,
            type: NotificationType.SYSTEM,
            message: `Sell order for ${order.property.address1} was cancelled.`,
          },
          tx
        ),
        ...(user.role === UserRole.ADMIN
          ? [
              orderRepository.createNotification(
                {
                  userId: user.id,
                  propertyId: order.propertyId,
                  sellOrderId: order.id,
                  type: NotificationType.SYSTEM,
                  message: `Admin action recorded: cancelled sell order ${order.id}.`,
                },
                tx
              ),
            ]
          : []),
        orderRepository.createAuditLog(
          {
            actorUserId: user.id,
            actorType: user.role === UserRole.ADMIN ? AuditActorType.ADMIN : AuditActorType.USER,
            action: AuditAction.UPDATE,
            entityType: "SELL_ORDER",
            entityId: order.id,
            targetUserId: order.userId,
            propertyId: order.propertyId,
            metadata: {
              previousStatus: order.status,
              nextStatus: SellOrderStatus.CANCELLED,
            },
          },
          tx
        ),
      ]);

      return {
        id: updated.id,
        side,
        status: updated.status,
        workflow: getExecutionSummary({
          status: updated.status,
          executedShares: updated.sharesForSale - updated.remainingShares,
          executionMode: "OPEN_ORDER",
        }),
      };
    });
  },
};
