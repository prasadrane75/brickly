import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export const documentRepository = {
  count(where: Prisma.DocumentWhereInput) {
    return prisma.document.count({ where });
  },

  findMany(where: Prisma.DocumentWhereInput, skip: number, take: number) {
    return prisma.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, email: true, role: true },
        },
        property: {
          select: { id: true, address1: true, city: true, state: true },
        },
        trade: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  },

  create(data: Prisma.DocumentUncheckedCreateInput) {
    return prisma.document.create({ data });
  },

  createNotification(data: Prisma.NotificationUncheckedCreateInput) {
    return prisma.notification.create({ data });
  },

  createAuditLog(data: Prisma.AdminAuditLogUncheckedCreateInput) {
    return prisma.adminAuditLog.create({ data });
  },

  findById(id: string) {
    return prisma.document.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: { id: true, email: true, role: true },
        },
        property: {
          select: { id: true, address1: true, city: true, state: true },
        },
        trade: {
          select: { id: true },
        },
      },
    });
  },
};
