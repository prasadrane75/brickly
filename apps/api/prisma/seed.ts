import bcrypt from "bcrypt";
import {
  PrismaClient,
  KycStatus,
  UserRole,
  PropertyStatus,
  ListingStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();

  const adminPasswordHash = await bcrypt.hash("admin-password", 12);
  const investorPasswordHash = await bcrypt.hash("investor-password", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@fractional.app" },
    update: { emailVerified: true },
    create: {
      email: "admin@fractional.app",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      emailVerified: true,
      kycProfile: {
        create: {
          status: KycStatus.APPROVED,
          data: { source: "seed" },
          submittedAt: new Date(),
        },
      },
    },
  });

  const investor = await prisma.user.upsert({
    where: { email: "investor@fractional.app" },
    update: { emailVerified: true },
    create: {
      email: "investor@fractional.app",
      passwordHash: investorPasswordHash,
      role: UserRole.INVESTOR,
      emailVerified: true,
      kycProfile: {
        create: {
          status: KycStatus.APPROVED,
          data: { source: "seed" },
          submittedAt: new Date(),
        },
      },
    },
  });

  const portlandPasswordHash = await bcrypt.hash("portland-password", 12);
  const portlandLister = await prisma.user.upsert({
    where: { email: "portland@outlook.com" },
    update: { emailVerified: true },
    create: {
      email: "portland@outlook.com",
      passwordHash: portlandPasswordHash,
      role: UserRole.LISTER,
      emailVerified: true,
    },
  });

  const tampaPasswordHash = await bcrypt.hash("tampa-password", 12);
  const tampaLister = await prisma.user.upsert({
    where: { email: "tampa@outlook.com" },
    update: { emailVerified: true },
    create: {
      email: "tampa@outlook.com",
      passwordHash: tampaPasswordHash,
      role: UserRole.LISTER,
      emailVerified: true,
    },
  });

  async function createListing(input: {
    property: {
      address1: string;
      city: string;
      state: string;
      zip: string;
      targetRaise?: number;
      estMonthlyRent?: number;
    };
    listing: {
      askingPrice: number;
      bonusPercent: number;
    };
    shareClass: {
      totalShares: number;
      referencePricePerShare: number;
    };
    images: string[];
  }) {
    return prisma.$transaction(async (tx) => {
      const property = await tx.property.create({
        data: {
          address1: input.property.address1,
          city: input.property.city,
          state: input.property.state,
          zip: input.property.zip,
          status: PropertyStatus.LISTED,
          targetRaise: input.property.targetRaise,
          estMonthlyRent: input.property.estMonthlyRent,
        },
      });

      const listing = await tx.listing.create({
        data: {
          propertyId: property.id,
          listerUserId:
            input.property.city === "Portland"
              ? portlandLister.id
              : input.property.city === "Tampa"
              ? tampaLister.id
              : admin.id,
          bonusPercent: input.listing.bonusPercent,
          askingPrice: input.listing.askingPrice,
          status: ListingStatus.LISTED,
          postedAt: new Date(),
        },
      });

      const shareClass = await tx.shareClass.create({
        data: {
          propertyId: property.id,
          totalShares: input.shareClass.totalShares,
          sharesAvailable: input.shareClass.totalShares,
          referencePricePerShare: input.shareClass.referencePricePerShare,
        },
      });

      if (input.images.length > 0) {
        await tx.propertyImage.createMany({
          data: input.images.map((url, index) => ({
            propertyId: property.id,
            url,
            sortOrder: index,
          })),
        });
      }

      return { property, listing, shareClass };
    });
  }

  const listingOne = await createListing({
    property: {
      type: "HOUSE",
      address1: "100 Harbor Way",
      city: "San Diego",
      state: "CA",
      zip: "92101",
      squareFeet: 1800,
      bedrooms: 3,
      bathrooms: 2,
      targetRaise: 1500000,
      estMonthlyRent: 6500,
    },
    listing: {
      askingPrice: 1850000,
      bonusPercent: 2.5,
    },
    shareClass: {
      totalShares: 10000,
      referencePricePerShare: 185,
    },
    images: [
      "https://images.unsplash.com/photo-1568605114967-8130f3a36994",
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae",
    ],
  });

  await createListing({
    property: {
      type: "CONDO",
      address1: "455 Cedar Loop",
      city: "Portland",
      state: "OR",
      zip: "97205",
      squareFeet: 950,
      bedrooms: 2,
      bathrooms: 1,
      targetRaise: 1200000,
      estMonthlyRent: 5200,
    },
    listing: {
      askingPrice: 1400000,
      bonusPercent: 1.75,
    },
    shareClass: {
      totalShares: 10000,
      referencePricePerShare: 140,
    },
    images: [
      "https://images.unsplash.com/photo-1449844908441-8829872d2607",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
    ],
  });

  await prisma.$transaction(async (tx) => {
    const shareClass = await tx.shareClass.findUnique({
      where: { propertyId: listingOne.property.id },
    });

    if (!shareClass) {
      throw new Error("Missing share class for listing one");
    }

    if (shareClass.sharesAvailable < 500) {
      throw new Error("Not enough shares available to seed holding");
    }

    await tx.shareClass.update({
      where: { id: shareClass.id },
      data: { sharesAvailable: shareClass.sharesAvailable - 500 },
    });

    await tx.holding.upsert({
      where: {
        userId_shareClassId: {
          userId: investor.id,
          shareClassId: shareClass.id,
        },
      },
      update: { sharesOwned: 500 },
      create: {
        userId: investor.id,
        shareClassId: shareClass.id,
        sharesOwned: 500,
      },
    });
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
