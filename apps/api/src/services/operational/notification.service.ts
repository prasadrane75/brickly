import { NotificationType, Prisma } from "@prisma/client";
import { notificationRepository } from "../../repositories/notification.repository.js";
import { buildExtensionFields } from "../../shared/http/extensions.js";
import { ApiError } from "../../shared/http/apiError.js";

export const notificationService = {
  async list(
    userId: string,
    unreadOnly: boolean,
    pagination: { skip: number; take: number; page: number; pageSize: number }
  ) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      readAt: unreadOnly ? null : undefined,
    };

    const [total, notifications] = await Promise.all([
      notificationRepository.count(where),
      notificationRepository.findMany(where, pagination.skip, pagination.take),
    ]);

    return {
      total,
      items: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        category: notification.type,
        title:
          notification.type === NotificationType.TRADE
            ? "Order completed"
            : notification.type === NotificationType.DOCUMENT
              ? "Document update"
              : notification.type === NotificationType.TARGETED_OFFER
                ? "New opportunity"
                : "Platform update",
        message: notification.message,
        propertyId: notification.propertyId,
        sellOrderId: notification.sellOrderId,
        createdAt: notification.createdAt,
        readAt: notification.readAt,
        ...buildExtensionFields(),
      })),
    };
  },

  async markRead(userId: string, notificationId: string) {
    const updated = await notificationRepository.markRead(notificationId, userId);
    if (updated.count === 0) {
      throw new ApiError(404, "NOT_FOUND", "Notification not found");
    }
    return { ok: true };
  },

  async markAllRead(userId: string) {
    await notificationRepository.markAllRead(userId);
    return { ok: true };
  },
};
