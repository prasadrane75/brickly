import { Prisma, UserRole } from "@prisma/client";
import { transactionRepository } from "../../repositories/transaction.repository.js";
import { buildExtensionFields } from "../../shared/http/extensions.js";
import { ApiError } from "../../shared/http/apiError.js";

export const transactionService = {
  async list(
    filters: { userId: string; role: UserRole; propertyId?: string },
    pagination: { skip: number; take: number; page: number; pageSize: number }
  ) {
    const where: Prisma.TradeWhereInput = {
      propertyId: filters.propertyId,
      ...(filters.role === UserRole.ADMIN
        ? {}
        : {
            OR: [{ buyerUserId: filters.userId }, { sellerUserId: filters.userId }],
          }),
    };

    const [total, trades] = await Promise.all([
      transactionRepository.count(where),
      transactionRepository.findMany(where, pagination.skip, pagination.take),
    ]);

    return {
      total,
      items: trades.map((trade) => ({
        id: trade.id,
        tradedAt: trade.tradedAt,
        sharesTraded: trade.sharesTraded,
        pricePerShare: Number(trade.pricePerShare),
        totalAmount: Number(trade.pricePerShare) * trade.sharesTraded,
        direction: trade.buyerUserId === filters.userId ? "BUY" : "SELL",
        buyer: trade.buyer,
        seller: trade.seller,
        property: {
          id: trade.property.id,
          name: trade.property.address1,
          address1: trade.property.address1,
          city: trade.property.city,
          state: trade.property.state,
          thumbnailUrl: trade.property.images[0]?.url ?? null,
        },
        ...buildExtensionFields({
          verificationStatus: trade.verificationStatus,
          blockchainTxHash: trade.blockchainTxHash,
          aiSummaryCache: trade.aiSummaryCache,
        }),
      })),
    };
  },

  async getDetail(
    filters: { userId: string; role: UserRole },
    transactionId: string
  ) {
    const trade = await transactionRepository.findById(transactionId);

    if (!trade) {
      throw new ApiError(404, "NOT_FOUND", "Transaction not found");
    }

    if (
      filters.role !== UserRole.ADMIN &&
      trade.buyerUserId !== filters.userId &&
      trade.sellerUserId !== filters.userId
    ) {
      throw new ApiError(403, "FORBIDDEN", "Not allowed to view this transaction");
    }

    const direction = trade.buyerUserId === filters.userId ? "BUY" : "SELL";
    const totalAmount = Number(trade.pricePerShare) * trade.sharesTraded;

    return {
      id: trade.id,
      tradedAt: trade.tradedAt,
      sharesTraded: trade.sharesTraded,
      pricePerShare: Number(trade.pricePerShare),
      totalAmount,
      direction,
      buyer: trade.buyer,
      seller: trade.seller,
      property: {
        id: trade.property.id,
        name: trade.property.address1,
        address1: trade.property.address1,
        city: trade.property.city,
        state: trade.property.state,
        thumbnailUrl: trade.property.images[0]?.url ?? null,
      },
      sellOrder: {
        id: trade.sellOrder.id,
        status: trade.sellOrder.status,
        strategy: trade.sellOrder.strategy,
        askPricePerShare: Number(trade.sellOrder.askPricePerShare),
        createdAt: trade.sellOrder.createdAt,
      },
      ...buildExtensionFields({
        verificationStatus: trade.verificationStatus,
        blockchainTxHash: trade.blockchainTxHash,
        aiSummaryCache: trade.aiSummaryCache,
      }),
    };
  },
};
