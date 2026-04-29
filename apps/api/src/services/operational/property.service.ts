import { Prisma } from "@prisma/client";
import { propertyRepository } from "../../repositories/property.repository.js";
import { ApiError } from "../../shared/http/apiError.js";
import { buildExtensionFields } from "../../shared/http/extensions.js";

export const propertyService = {
  async list(
    filters: {
      status?: string;
      city?: string;
      state?: string;
      verificationStatus?: string;
      sortBy: "createdAt" | "address1" | "liquidityScore" | "lastTradeAt";
      sortOrder: "asc" | "desc";
    },
    pagination: { skip: number; take: number; page: number; pageSize: number }
  ) {
    const where: Prisma.PropertyWhereInput = {
      status: filters.status as any || undefined,
      city: filters.city
        ? { contains: filters.city, mode: "insensitive" }
        : undefined,
      state: filters.state
        ? { equals: filters.state, mode: "insensitive" }
        : undefined,
      verificationStatus: filters.verificationStatus as any || undefined,
    };

    const orderBy: Prisma.PropertyOrderByWithRelationInput = {
      [filters.sortBy]: filters.sortOrder,
    };

    const [total, properties] = await Promise.all([
      propertyRepository.count(where),
      propertyRepository.findMany({
        where,
        orderBy,
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return {
      items: properties.map((property) => ({
        id: property.id,
        address1: property.address1,
        city: property.city,
        state: property.state,
        zip: property.zip,
        status: property.status,
        type: property.type,
        liquidityScore: property.liquidityScore,
        targetRaise: property.targetRaise ? Number(property.targetRaise) : null,
        estMonthlyRent: property.estMonthlyRent ? Number(property.estMonthlyRent) : null,
        thumbnailUrl: property.images[0]?.url ?? null,
        investorCount: null,
        documentCount: property._count.documents,
        shareClass: property.shareClass
          ? {
              totalShares: property.shareClass.totalShares,
              sharesAvailable: property.shareClass.sharesAvailable,
              referencePricePerShare: Number(property.shareClass.referencePricePerShare),
            }
          : null,
        listing: property.listings[0]
          ? {
              askingPrice: Number(property.listings[0].askingPrice),
              status: property.listings[0].status,
            }
          : null,
        ...buildExtensionFields({
          verificationStatus: property.verificationStatus,
          blockchainTxHash: property.blockchainTxHash,
          aiSummaryCache: property.aiSummaryCache,
        }),
      })),
      total,
    };
  },

  async detail(propertyId: string) {
    const property = await propertyRepository.findDetailById(propertyId);
    if (!property) {
      throw new ApiError(404, "NOT_FOUND", "Property not found");
    }

    return {
      id: property.id,
      address1: property.address1,
      city: property.city,
      state: property.state,
      zip: property.zip,
      status: property.status,
      type: property.type,
      squareFeet: property.squareFeet,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      sourceType: property.sourceType,
      sourceAttribution: property.sourceAttribution,
      targetRaise: property.targetRaise ? Number(property.targetRaise) : null,
      estMonthlyRent: property.estMonthlyRent ? Number(property.estMonthlyRent) : null,
      liquidityScore: property.liquidityScore,
      lastTradeAt: property.lastTradeAt,
      counts: {
        investors: null,
        trades: property._count.trades,
        documents: property._count.documents,
      },
      images: property.images.map((image: (typeof property.images)[number]) => ({
        id: image.id,
        url: image.url,
        sortOrder: image.sortOrder,
      })),
      shareClass: property.shareClass
        ? {
            id: property.shareClass.id,
            totalShares: property.shareClass.totalShares,
            sharesAvailable: property.shareClass.sharesAvailable,
            referencePricePerShare: Number(property.shareClass.referencePricePerShare),
          }
        : null,
      listings: property.listings.map((listing: (typeof property.listings)[number]) => ({
        id: listing.id,
        askingPrice: Number(listing.askingPrice),
        bonusPercent: Number(listing.bonusPercent),
        status: listing.status,
        postedAt: listing.postedAt,
        lister: listing.lister,
      })),
      documents: property.documents.map((document: (typeof property.documents)[number]) => ({
        id: document.id,
        fileName: document.fileName,
        fileUrl: document.fileUrl,
        kind: document.kind,
        createdAt: document.createdAt,
        ...buildExtensionFields({
          verificationStatus: document.verificationStatus,
          blockchainTxHash: document.blockchainTxHash,
          aiSummaryCache: document.aiSummaryCache,
        }),
      })),
      ...buildExtensionFields({
        verificationStatus: property.verificationStatus,
        blockchainTxHash: property.blockchainTxHash,
        aiSummaryCache: property.aiSummaryCache,
      }),
    };
  },
};
