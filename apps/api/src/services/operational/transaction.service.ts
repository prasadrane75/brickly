import { Prisma, UserRole } from "@prisma/client";
import { transactionRepository } from "../../repositories/transaction.repository.js";
import { buildExtensionFields } from "../../shared/http/extensions.js";

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
};
