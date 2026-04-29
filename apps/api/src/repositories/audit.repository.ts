import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export const auditRepository = {
  count(where: Prisma.AdminAuditLogWhereInput) {
    return prisma.adminAuditLog.count({ where });
  },

  findMany(where: Prisma.AdminAuditLogWhereInput, skip: number, take: number) {
    return prisma.adminAuditLog.findMany({
      where,
      include: {
        actorUser: {
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

  create(data: Prisma.AdminAuditLogUncheckedCreateInput) {
    return prisma.adminAuditLog.create({ data });
  },
};
