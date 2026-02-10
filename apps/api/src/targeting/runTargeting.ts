import { PrismaClient, NotificationType } from "@prisma/client";
import {
  getTargetingConfig,
  scoreBuyersForSellOrder,
} from "./scoreBuyersForSellOrder.js";

export function buildTargetingMessage(address: string) {
  return `New opportunity: shares available in ${address}. Recommended: place a LIMIT buy near the reference price to capture availability.`;
}

export async function runTargetingForSellOrder(
  prisma: PrismaClient,
  sellOrderId: string
) {
  const sellOrder = await prisma.sellOrder.findUnique({
    where: { id: sellOrderId },
    include: { property: true },
  });
  if (!sellOrder) {
    throw new Error("SELL_ORDER_NOT_FOUND");
  }

  const scored = await scoreBuyersForSellOrder(prisma, sellOrderId);
  if (!scored.length) {
    return { offersCreated: 0, notificationsCreated: 0 };
  }

  const config = await getTargetingConfig(prisma);
  const minScore = Math.max(0, config.minScoreToTarget);
  const maxBuyers = Math.max(1, config.maxBuyersPerOrder);

  let filtered = scored.filter((buyer) => buyer.score >= minScore);

  if (config.cooldownHours > 0 && filtered.length > 0) {
    const cutoff = new Date(Date.now() - config.cooldownHours * 60 * 60 * 1000);
    const recentNotifications = await prisma.notification.findMany({
      where: {
        userId: { in: filtered.map((buyer) => buyer.buyerUserId) },
        propertyId: sellOrder.propertyId,
        type: NotificationType.TARGETED_OFFER,
        createdAt: { gte: cutoff },
      },
      select: { userId: true },
    });
    const recentSet = new Set(recentNotifications.map((row) => row.userId));
    filtered = filtered.filter((buyer) => !recentSet.has(buyer.buyerUserId));
  }

  if (!filtered.length) {
    return { offersCreated: 0, notificationsCreated: 0 };
  }

  const selected = filtered.slice(0, maxBuyers);

  const offersData = selected.map((buyer) => ({
    sellOrderId,
    buyerUserId: buyer.buyerUserId,
    score: buyer.score,
  }));

  const offers = await prisma.targetedOffer.createMany({
    data: offersData,
    skipDuplicates: true,
  });

  const message = buildTargetingMessage(sellOrder.property.address1);
  const notifications = await prisma.notification.createMany({
    data: selected.map((buyer) => ({
      userId: buyer.buyerUserId,
      sellOrderId,
      propertyId: sellOrder.propertyId,
      type: NotificationType.TARGETED_OFFER,
      message,
    })),
    skipDuplicates: true,
  });

  return {
    offersCreated: offers.count,
    notificationsCreated: notifications.count,
  };
}
