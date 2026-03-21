import { prisma } from "../db/prisma.js";
import { BuyOrderStatus, SellOrderStatus } from "@prisma/client";

export const portfolioRepository = {
  findUserForSummary(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        kycProfile: {
          select: {
            status: true,
            submittedAt: true,
          },
        },
      },
    });
  },

  findHoldingsForSummary(userId: string) {
    return prisma.holding.findMany({
      where: { userId },
      include: {
        shareClass: {
          include: {
            property: {
              include: {
                images: {
                  orderBy: { sortOrder: "asc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  },

  findRecentTransactions(userId: string) {
    return prisma.trade.findMany({
      where: {
        OR: [{ buyerUserId: userId }, { sellerUserId: userId }],
      },
      include: {
        property: {
          include: {
            images: {
              orderBy: { sortOrder: "asc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { tradedAt: "desc" },
      take: 10,
    });
  },

  findOpenBuyOrders(userId: string) {
    return prisma.buyOrder.findMany({
      where: {
        buyerUserId: userId,
        status: { in: [BuyOrderStatus.OPEN, BuyOrderStatus.PARTIAL] },
      },
      include: {
        property: {
          include: {
            images: {
              orderBy: { sortOrder: "asc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  },

  findOpenSellOrders(userId: string) {
    return prisma.sellOrder.findMany({
      where: {
        userId,
        status: { in: [SellOrderStatus.OPEN, SellOrderStatus.PARTIAL] },
      },
      include: {
        property: {
          include: {
            images: {
              orderBy: { sortOrder: "asc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  },

  findNotificationsPreview(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  },
};
