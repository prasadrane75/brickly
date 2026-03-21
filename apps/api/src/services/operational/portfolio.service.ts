import { portfolioRepository } from "../../repositories/portfolio.repository.js";
import { buildExtensionFields } from "../../shared/http/extensions.js";
import {
  computeHoldingEstimatedIncome,
  computeHoldingInvestedAmount,
  roundCurrency,
} from "./portfolioSummary.helpers.js";
import { ApiError } from "../../shared/http/apiError.js";

export const portfolioService = {
  async getSummary(userId: string) {
    const [user, holdings, recentTransactions, openBuyOrders, openSellOrders, notifications] =
      await Promise.all([
        portfolioRepository.findUserForSummary(userId),
        portfolioRepository.findHoldingsForSummary(userId),
        portfolioRepository.findRecentTransactions(userId),
        portfolioRepository.findOpenBuyOrders(userId),
        portfolioRepository.findOpenSellOrders(userId),
        portfolioRepository.findNotificationsPreview(userId),
      ]);

    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User not found");
    }

    const normalizedHoldings = holdings.map((holding) => {
      const estimatedValue =
        holding.sharesOwned * Number(holding.shareClass.referencePricePerShare);
      const investedAmount = computeHoldingInvestedAmount(
        holding,
        userId,
        recentTransactions
      );
      const estimatedMonthlyIncome = computeHoldingEstimatedIncome(holding);

      return {
        id: holding.id,
        sharesOwned: holding.sharesOwned,
        estimatedValue: roundCurrency(estimatedValue),
        investedAmount: roundCurrency(investedAmount),
        estimatedMonthlyIncome: roundCurrency(estimatedMonthlyIncome),
        allocationWeight: 0,
        property: {
          id: holding.shareClass.property.id,
          name: holding.shareClass.property.address1,
          address1: holding.shareClass.property.address1,
          city: holding.shareClass.property.city,
          state: holding.shareClass.property.state,
          status: holding.shareClass.property.status,
          thumbnailUrl: holding.shareClass.property.images[0]?.url ?? null,
          ...buildExtensionFields({
            verificationStatus: holding.shareClass.property.verificationStatus,
            blockchainTxHash: holding.shareClass.property.blockchainTxHash,
            aiSummaryCache: holding.shareClass.property.aiSummaryCache,
          }),
        },
        shareClass: {
          id: holding.shareClass.id,
          totalShares: holding.shareClass.totalShares,
          sharesAvailable: holding.shareClass.sharesAvailable,
          referencePricePerShare: Number(holding.shareClass.referencePricePerShare),
        },
      };
    });

    const totalPortfolioValue = normalizedHoldings.reduce(
      (sum, holding) => sum + holding.estimatedValue,
      0
    );
    const totalInvestedAmount = normalizedHoldings.reduce(
      (sum, holding) => sum + holding.investedAmount,
      0
    );
    const estimatedMonthlyIncome = normalizedHoldings.reduce(
      (sum, holding) => sum + holding.estimatedMonthlyIncome,
      0
    );

    const holdingsWithAllocation = normalizedHoldings.map((holding) => ({
      ...holding,
      allocationWeight:
        totalPortfolioValue > 0
          ? roundCurrency((holding.estimatedValue / totalPortfolioValue) * 100)
          : 0,
    }));

    const allocationByProperty = holdingsWithAllocation.map((holding) => ({
      propertyId: holding.property.id,
      propertyName: holding.property.name,
      marketValue: holding.estimatedValue,
      investedAmount: holding.investedAmount,
      estimatedMonthlyIncome: holding.estimatedMonthlyIncome,
      allocationPercent: holding.allocationWeight,
      thumbnailUrl: holding.property.thumbnailUrl,
      ...buildExtensionFields({
        verificationStatus: holding.property.verificationStatus,
      }),
    }));

    // PHASE_2_AI: this payload is intentionally shaped to become the single
    // backend-produced input for portfolio narrative generation and insights.
    return {
      generatedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        kycStatus: user.kycProfile?.status ?? null,
        createdAt: user.createdAt,
        ...buildExtensionFields({
          verificationStatus: user.verificationStatus,
          aiSummaryCache: user.aiSummaryCache,
        }),
      },
      summary: {
        totalPortfolioValue: roundCurrency(totalPortfolioValue),
        totalInvestedAmount: roundCurrency(totalInvestedAmount),
        totalUnrealizedChange: roundCurrency(
          totalPortfolioValue - totalInvestedAmount
        ),
        estimatedMonthlyIncome: roundCurrency(estimatedMonthlyIncome),
        estimatedAnnualIncome: roundCurrency(estimatedMonthlyIncome * 12),
        distinctProperties: holdingsWithAllocation.length,
        totalPositions: holdingsWithAllocation.length,
        totalSharesOwned: holdingsWithAllocation.reduce(
          (sum, holding) => sum + holding.sharesOwned,
          0
        ),
      },
      currentHoldings: holdingsWithAllocation,
      allocationByProperty,
      recentTransactions: recentTransactions.map((trade) => ({
        id: trade.id,
        tradedAt: trade.tradedAt,
        direction: trade.buyerUserId === userId ? "BUY" : "SELL",
        sharesTraded: trade.sharesTraded,
        pricePerShare: Number(trade.pricePerShare),
        totalAmount: roundCurrency(
          trade.sharesTraded * Number(trade.pricePerShare)
        ),
        property: {
          id: trade.property.id,
          name: trade.property.address1,
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
      openOrders: {
        buy: openBuyOrders.map((order) => ({
          id: order.id,
          status: order.status,
          orderType: order.orderType,
          sharesRequested: order.sharesRequested,
          filledShares: order.filledShares,
          maxPricePerShare: order.maxPricePerShare
            ? Number(order.maxPricePerShare)
            : null,
          createdAt: order.createdAt,
          property: {
            id: order.property.id,
            name: order.property.address1,
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
        sell: openSellOrders.map((order) => ({
          id: order.id,
          status: order.status,
          strategy: order.strategy,
          sharesForSale: order.sharesForSale,
          remainingShares: order.remainingShares,
          askPricePerShare: Number(order.askPricePerShare),
          createdAt: order.createdAt,
          property: {
            id: order.property.id,
            name: order.property.address1,
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
      },
      notificationsPreview: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        message: notification.message,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
        propertyId: notification.propertyId,
        sellOrderId: notification.sellOrderId,
      })),
    };
  },
};
