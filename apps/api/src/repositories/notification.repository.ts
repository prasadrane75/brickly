import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export const notificationRepository = {
  count(where: Prisma.NotificationWhereInput) {
    return prisma.notification.count({ where });
  },

  findMany(where: Prisma.NotificationWhereInput, skip: number, take: number) {
    return prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  },

  create(data: Prisma.NotificationUncheckedCreateInput) {
    return prisma.notification.create({ data });
  },

  markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  },

  markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },
};
