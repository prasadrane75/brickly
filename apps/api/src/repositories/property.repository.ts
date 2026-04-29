import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export const propertyRepository = {
  count(where: Prisma.PropertyWhereInput) {
    return prisma.property.count({ where });
  },

  findMany(params: {
    where: Prisma.PropertyWhereInput;
    orderBy: Prisma.PropertyOrderByWithRelationInput;
    skip: number;
    take: number;
  }) {
    return prisma.property.findMany({
      ...params,
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
        shareClass: true,
        listings: {
          where: { status: "LISTED" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            documents: true,
            trades: true,
          },
        },
      },
    });
  },

  findDetailById(propertyId: string) {
    return prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        shareClass: true,
        listings: {
          include: {
            lister: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        documents: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        _count: {
          select: {
            trades: true,
            documents: true,
          },
        },
      },
    });
  },
};
