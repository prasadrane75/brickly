import { prisma } from "../db/prisma.js";

export const userRepository = {
  findProfileById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        kycProfile: true,
      },
    });
  },

  countHoldingsByUser(userId: string) {
    return prisma.holding.count({
      where: { userId },
    });
  },

  findHoldingsByUser(userId: string, skip: number, take: number) {
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
      skip,
      take,
    });
  },
};
