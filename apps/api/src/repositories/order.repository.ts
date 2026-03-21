import {
  BuyOrderStatus,
  NotificationType,
  Prisma,
  SellOrderStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "../db/prisma.js";

type DbClient = Prisma.TransactionClient;

function getClient(tx?: DbClient) {
  return tx ?? prisma;
}

export const orderRepository = {
  runInTransaction<T>(callback: (tx: DbClient) => Promise<T>) {
    return prisma.$transaction(callback);
  },

  countSellOrders(where: Prisma.SellOrderWhereInput) {
    return prisma.sellOrder.count({ where });
  },

  findSellOrders(where: Prisma.SellOrderWhereInput, skip: number, take: number) {
    return prisma.sellOrder.findMany({
      where,
      include: {
        property: {
          include: {
            images: {
              orderBy: { sortOrder: "asc" },
              take: 1,
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  },

  countBuyOrders(where: Prisma.BuyOrderWhereInput) {
    return prisma.buyOrder.count({ where });
  },

  findBuyOrders(where: Prisma.BuyOrderWhereInput, skip: number, take: number) {
    return prisma.buyOrder.findMany({
      where,
      include: {
        property: {
          include: {
            images: {
              orderBy: { sortOrder: "asc" },
              take: 1,
            },
          },
        },
        buyer: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  },

  findShareClassByPropertyId(propertyId: string, tx?: DbClient) {
    return getClient(tx).shareClass.findUnique({
      where: { propertyId },
    });
  },

  findHolding(userId: string, shareClassId: string, tx?: DbClient) {
    return getClient(tx).holding.findUnique({
      where: {
        userId_shareClassId: {
          userId,
          shareClassId,
        },
      },
    });
  },

  findPropertyExecutionContext(propertyId: string, tx?: DbClient) {
    return getClient(tx).property.findUnique({
      where: { id: propertyId },
      include: {
        shareClass: true,
        listings: {
          orderBy: [{ postedAt: "asc" }, { createdAt: "asc" }],
          take: 1,
        },
      },
    });
  },

  findFallbackCounterpartyUser(excludeUserId: string, tx?: DbClient) {
    return getClient(tx).user.findFirst({
      where: { id: { not: excludeUserId }, role: { in: [UserRole.LISTER, UserRole.ADMIN] } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: { id: true, email: true, role: true },
    });
  },

  findMatchingSellOrder(
    input: { propertyId: string; buyerUserId: string; maxPricePerShare?: Prisma.Decimal | null },
    tx?: DbClient
  ) {
    return getClient(tx).sellOrder.findFirst({
      where: {
        propertyId: input.propertyId,
        userId: { not: input.buyerUserId },
        status: { in: [SellOrderStatus.OPEN, SellOrderStatus.PARTIAL] },
        remainingShares: { gt: 0 },
        askPricePerShare: input.maxPricePerShare
          ? { lte: input.maxPricePerShare }
          : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ askPricePerShare: "asc" }, { createdAt: "asc" }],
    });
  },

  findMatchingBuyOrder(
    input: { propertyId: string; sellerUserId: string; askPricePerShare: Prisma.Decimal },
    tx?: DbClient
  ) {
    return getClient(tx).buyOrder.findFirst({
      where: {
        propertyId: input.propertyId,
        buyerUserId: { not: input.sellerUserId },
        status: { in: [BuyOrderStatus.OPEN, BuyOrderStatus.PARTIAL] },
        OR: [
          { orderType: "MARKET" },
          { maxPricePerShare: { gte: input.askPricePerShare } },
        ],
      },
      include: {
        buyer: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    });
  },

  createBuyOrder(data: Prisma.BuyOrderUncheckedCreateInput, tx?: DbClient) {
    return getClient(tx).buyOrder.create({ data });
  },

  createSellOrder(data: Prisma.SellOrderUncheckedCreateInput, tx?: DbClient) {
    return getClient(tx).sellOrder.create({ data });
  },

  updateBuyOrder(id: string, data: Prisma.BuyOrderUncheckedUpdateInput, tx?: DbClient) {
    return getClient(tx).buyOrder.update({
      where: { id },
      data,
    });
  },

  updateSellOrder(id: string, data: Prisma.SellOrderUncheckedUpdateInput, tx?: DbClient) {
    return getClient(tx).sellOrder.update({
      where: { id },
      data,
    });
  },

  findBuyOrderById(id: string, tx?: DbClient) {
    return getClient(tx).buyOrder.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            address1: true,
            city: true,
            state: true,
          },
        },
      },
    });
  },

  findSellOrderById(id: string, tx?: DbClient) {
    return getClient(tx).sellOrder.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            address1: true,
            city: true,
            state: true,
          },
        },
      },
    });
  },

  adjustShareInventory(shareClassId: string, deltaSharesAvailable: number, tx?: DbClient) {
    return getClient(tx).shareClass.update({
      where: { id: shareClassId },
      data: {
        sharesAvailable: {
          increment: deltaSharesAvailable,
        },
        lastReferenceUpdateAt: new Date(),
      },
    });
  },

  decrementHoldingShares(userId: string, shareClassId: string, shares: number, tx?: DbClient) {
    return getClient(tx).holding.update({
      where: {
        userId_shareClassId: {
          userId,
          shareClassId,
        },
      },
      data: {
        sharesOwned: {
          decrement: shares,
        },
      },
    });
  },

  upsertHoldingShares(userId: string, shareClassId: string, shares: number, tx?: DbClient) {
    return getClient(tx).holding.upsert({
      where: {
        userId_shareClassId: {
          userId,
          shareClassId,
        },
      },
      create: {
        userId,
        shareClassId,
        sharesOwned: shares,
      },
      update: {
        sharesOwned: {
          increment: shares,
        },
      },
    });
  },

  deleteEmptyHoldingIfNeeded(userId: string, shareClassId: string, tx?: DbClient) {
    return getClient(tx).holding.deleteMany({
      where: {
        userId,
        shareClassId,
        sharesOwned: { lte: 0 },
      },
    });
  },

  createTrade(data: Prisma.TradeUncheckedCreateInput, tx?: DbClient) {
    return getClient(tx).trade.create({ data });
  },

  updatePropertyTradeTimestamp(propertyId: string, tradedAt: Date, tx?: DbClient) {
    return getClient(tx).property.update({
      where: { id: propertyId },
      data: { lastTradeAt: tradedAt },
    });
  },

  createNotification(data: Prisma.NotificationUncheckedCreateInput, tx?: DbClient) {
    return getClient(tx).notification.create({ data });
  },

  createAuditLog(data: Prisma.AdminAuditLogUncheckedCreateInput, tx?: DbClient) {
    return getClient(tx).adminAuditLog.create({ data });
  },

  async createTradeConfirmationDocument(
    input: {
      uploadedByUserId: string;
      propertyId: string;
      tradeId: string;
      buyOrderId?: string;
      sellOrderId: string;
      fileName: string;
      fileUrl: string;
      metadata?: Prisma.InputJsonValue;
    },
    tx?: DbClient
  ) {
    return getClient(tx).document.create({
      data: {
        uploadedByUserId: input.uploadedByUserId,
        propertyId: input.propertyId,
        tradeId: input.tradeId,
        buyOrderId: input.buyOrderId,
        sellOrderId: input.sellOrderId,
        entityType: "TRANSACTION",
        kind: "TRADE_CONFIRMATION",
        status: "ACTIVE",
        verificationStatus: "PENDING",
        fileName: input.fileName,
        fileUrl: input.fileUrl,
        metadata: input.metadata,
      },
    });
  },
};
