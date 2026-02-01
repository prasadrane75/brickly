import { PrismaClient, SourceType } from "@prisma/client";
import { mockListings } from "./mockListings.js";

function sourceFromExternalId(externalId: string): SourceType {
  if (externalId.startsWith("partner-")) return SourceType.PARTNER;
  if (externalId.startsWith("pub-")) return SourceType.PUBLIC;
  return SourceType.PUBLIC;
}

export async function seedMLSListings(prisma: PrismaClient) {
  let count = 0;
  for (const listing of mockListings) {
    const sourceType = sourceFromExternalId(listing.id);
    await prisma.mLSListing.upsert({
      where: { externalId: listing.id },
      update: {
        sourceType,
        address: listing.address,
        city: listing.city,
        state: listing.state,
        zip: listing.zip,
        listPrice: listing.listPrice,
        rentEstimate: listing.rentEstimate,
        beds: listing.beds,
        baths: listing.baths,
        sqft: listing.sqft,
        yearBuilt: listing.yearBuilt,
        images: listing.images,
        thumbUrl: listing.thumbUrl,
        status: listing.status,
        attribution: listing.attribution,
      },
      create: {
        externalId: listing.id,
        sourceType,
        address: listing.address,
        city: listing.city,
        state: listing.state,
        zip: listing.zip,
        listPrice: listing.listPrice,
        rentEstimate: listing.rentEstimate,
        beds: listing.beds,
        baths: listing.baths,
        sqft: listing.sqft,
        yearBuilt: listing.yearBuilt,
        images: listing.images,
        thumbUrl: listing.thumbUrl,
        status: listing.status,
        attribution: listing.attribution,
      },
    });
    count += 1;
  }
  return count;
}
