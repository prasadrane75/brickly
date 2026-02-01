import type express from "express";
import { PrismaClient, PropertyStatus, ListingStatus, PropertyType, SourceType } from "@prisma/client";
import { z } from "zod";
import { mockListings } from "./mockListings.js";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://app:app@localhost:5433/fractional";
}

const prisma = new PrismaClient();

const searchSchema = z.object({
  source: z.enum(["PUBLIC", "PARTNER"]),
  q: z.string().optional(),
});

const propertyInputSchema = z.object({
  type: z.nativeEnum(PropertyType).optional(),
  address1: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  squareFeet: z.number().int().positive().optional(),
  bedrooms: z.number().int().positive().optional(),
  bathrooms: z.number().int().positive().optional(),
  targetRaise: z.number().positive().optional(),
  estMonthlyRent: z.number().positive().optional(),
});

const listingInputSchema = z.object({
  askingPrice: z.number().positive(),
  bonusPercent: z.number().nonnegative(),
});

const shareClassInputSchema = z.object({
  totalShares: z.number().int().positive(),
  referencePricePerShare: z.number().positive(),
});

const confirmSchema = z.object({
  source: z.nativeEnum(SourceType),
  externalId: z.string().min(1),
  property: propertyInputSchema,
  listing: listingInputSchema,
  shareClass: shareClassInputSchema,
  images: z.array(z.string().url()).default([]),
  attribution: z.string().min(1).optional().nullable(),
});

function sendError(
  res: express.Response,
  status: number,
  code: string,
  message: string
) {
  return res.status(status).json({ error: { code, message } });
}

function matchesSource(id: string, source: "PUBLIC" | "PARTNER") {
  if (source === "PUBLIC") return id.startsWith("pub-");
  return id.startsWith("partner-");
}

export function listImports(req: express.Request, res: express.Response) {
  const parsed = searchSchema.safeParse({
    source: req.query.source,
    q: req.query.q,
  });
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || "Invalid request";
    return sendError(res, 400, "VALIDATION_ERROR", message);
  }

  const { source, q } = parsed.data;
  const term = q?.toString().trim().toLowerCase() || "";

  const results = mockListings
    .filter((listing) => matchesSource(listing.id, source))
    .filter((listing) => {
      if (!term) return true;
      const haystack = `${listing.address} ${listing.city} ${listing.zip}`.toLowerCase();
      return haystack.includes(term);
    })
    .slice(0, 10)
    .map((listing) => ({
      externalId: listing.id,
      addressLine: listing.address,
      city: listing.city,
      state: listing.state,
      zip: listing.zip,
      listPrice: listing.listPrice,
      beds: listing.beds,
      baths: listing.baths,
      thumbUrl: listing.thumbUrl,
      status: listing.status,
    }));

  return res.json(results);
}

export function getImportDetail(req: express.Request, res: express.Response) {
  const source = req.query.source;
  if (source !== "PUBLIC" && source !== "PARTNER") {
    return sendError(res, 400, "VALIDATION_ERROR", "Invalid source");
  }

  const listing = mockListings.find((item) => item.id === req.params.externalId);
  if (!listing || !matchesSource(listing.id, source)) {
    return sendError(res, 404, "NOT_FOUND", "Listing not found");
  }

  return res.json({
    externalId: listing.id,
    address: {
      line1: listing.address,
      city: listing.city,
      state: listing.state,
      zip: listing.zip,
    },
    facts: {
      beds: listing.beds,
      baths: listing.baths,
      sqft: listing.sqft,
      yearBuilt: listing.yearBuilt,
    },
    pricing: {
      listPrice: listing.listPrice,
      rentEstimate: listing.rentEstimate,
    },
    images: listing.images,
    thumbUrl: listing.thumbUrl,
    status: listing.status,
    attribution: listing.attribution,
  });
}

export async function confirmImport(req: express.Request, res: express.Response) {
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || "Invalid request";
    return sendError(res, 400, "VALIDATION_ERROR", message);
  }

  const { source, externalId, property, listing, shareClass, images, attribution } =
    parsed.data;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const newProperty = await tx.property.create({
        data: {
          type: property.type ?? PropertyType.HOUSE,
          address1: property.address1,
          city: property.city,
          state: property.state,
          zip: property.zip,
          status: PropertyStatus.LISTED,
          squareFeet: property.squareFeet,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          targetRaise: property.targetRaise,
          estMonthlyRent: property.estMonthlyRent,
          sourceType: source,
          sourceRefId: externalId,
          importedAt: new Date(),
          sourceAttribution: attribution ?? null,
        },
      });

      const newListing = await tx.listing.create({
        data: {
          propertyId: newProperty.id,
          listerUserId: req.user!.id,
          bonusPercent: listing.bonusPercent,
          askingPrice: listing.askingPrice,
          status: ListingStatus.LISTED,
          postedAt: new Date(),
        },
      });

      const newShareClass = await tx.shareClass.create({
        data: {
          propertyId: newProperty.id,
          totalShares: shareClass.totalShares,
          sharesAvailable: shareClass.totalShares,
          referencePricePerShare: shareClass.referencePricePerShare,
        },
      });

      const imagesCreated =
        images.length > 0
          ? await tx.propertyImage.createMany({
              data: images.map((url, index) => ({
                propertyId: newProperty.id,
                url,
                sortOrder: index,
              })),
            })
          : { count: 0 };

      return {
        property: newProperty,
        listing: newListing,
        shareClass: newShareClass,
        imagesCreated: imagesCreated.count,
      };
    });

    return res.status(201).json(created);
  } catch (error) {
    return sendError(res, 500, "INTERNAL_ERROR", "Failed to import listing");
  }
}
