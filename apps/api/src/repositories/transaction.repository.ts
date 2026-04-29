import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export const transactionRepository = {
  count(where: Prisma.TradeWhereInput) {
    return prisma.trade.count({ where });
  },

  findMany(where: Prisma.TradeWhereInput, skip: number, take: number) {
    return prisma.trade.findMany({
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
          select: { id: true, email: true, role: true },
        },
        seller: {
          select: { id: true, email: true, role: true },
        },
      },
      orderBy: { tradedAt: "desc" },
      skip,
      take,
    });
  },

  findById(id: string) {
    return prisma.trade.findUnique({
      where: { id },
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
          select: { id: true, email: true, role: true },
        },
        seller: {
          select: { id: true, email: true, role: true },
        },
        sellOrder: {
          select: {
            id: true,
            status: true,
            strategy: true,
            askPricePerShare: true,
            createdAt: true,
          },
        },
      },
    });
  },
};
